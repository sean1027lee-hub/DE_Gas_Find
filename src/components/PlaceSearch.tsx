"use client";
import { useId, useState } from "react";
import type { Place } from "@/lib/store";
import type { GeocodeResult } from "@/lib/types";
import { PinIcon, SearchIcon } from "./icons";

interface PlaceSearchProps {
  onPick: (place: Place) => void;
  autoFocus?: boolean;
}

/** Postal code / city search. Submit-only (Nominatim forbids search-as-you-type). */
export function PlaceSearch({ onPick, autoFocus }: PlaceSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "done"; results: GeocodeResult[] } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setState({ kind: "error", message: "우편번호나 도시 이름을 2글자 이상 입력해 주세요." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error);
      setState({ kind: "done", results: body.results as GeocodeResult[] });
    } catch (err) {
      setState({
        kind: "error",
        message: navigator.onLine
          ? (err as Error).message || "검색하지 못했어요. 잠시 후 다시 시도해 주세요."
          : "오프라인이라 검색할 수 없어요.",
      });
    }
  };

  return (
    <div>
      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          우편번호 또는 도시
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="우편번호 또는 도시 (예: 64283)"
          autoComplete="postal-code"
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-[16px] placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="grid min-h-12 w-12 place-items-center rounded-[var(--radius-control)] bg-ink text-surface"
          aria-label="검색"
        >
          <SearchIcon size={20} />
        </button>
      </form>
      <div aria-live="polite" className="mt-2">
        {state.kind === "loading" && <p className="py-3 text-[14px] text-ink-2">검색 중…</p>}
        {state.kind === "error" && <p className="py-3 text-[14px] text-high">{state.message}</p>}
        {state.kind === "done" && state.results.length === 0 && (
          <p className="py-3 text-[14px] text-ink-2">검색 결과가 없어요. 독일 우편번호(5자리)나 도시 이름으로 찾아보세요.</p>
        )}
        {state.kind === "done" && state.results.length > 0 && (
          <ul className="divide-y divide-line">
            {state.results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  onClick={() => onPick({ lat: r.lat, lng: r.lng, label: r.label })}
                  className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-surface-2"
                >
                  <PinIcon size={18} className="shrink-0 text-ink-2" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium" lang="de">
                      {r.label}
                    </span>
                    {r.sublabel && (
                      <span className="block truncate text-[13px] text-ink-2" lang="de">
                        {r.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
