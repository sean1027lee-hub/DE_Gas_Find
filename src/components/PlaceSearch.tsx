"use client";
import { useId, useState } from "react";
import { useT, type MessageKey } from "@/i18n";
import type { Place } from "@/lib/store";
import type { GeocodeResult } from "@/lib/types";
import { PinIcon, SearchIcon } from "./icons";

interface PlaceSearchProps {
  onPick: (place: Place) => void;
  autoFocus?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; results: GeocodeResult[] }
  | { kind: "error"; message: MessageKey };

/** Postal code / city search. Submit-only (Nominatim forbids search-as-you-type). */
export function PlaceSearch({ onPick, autoFocus }: PlaceSearchProps) {
  const { t } = useT();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setState({ kind: "error", message: "search.tooShort" });
      return;
    }
    if (!navigator.onLine) {
      setState({ kind: "error", message: "search.offline" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { results: GeocodeResult[] };
      setState({ kind: "done", results: body.results });
    } catch {
      setState({ kind: "error", message: "search.failed" });
    }
  };

  return (
    <div>
      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("search.label")}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          autoComplete="postal-code"
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-base placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="grid min-h-12 w-12 place-items-center rounded-[var(--radius-control)] bg-ink text-surface"
          aria-label={t("search.submit")}
        >
          <SearchIcon size={20} />
        </button>
      </form>
      <div aria-live="polite" className="mt-2">
        {state.kind === "loading" && <p className="py-3 text-sm text-ink-2">{t("search.searching")}</p>}
        {state.kind === "error" && <p className="py-3 text-sm text-high">{t(state.message)}</p>}
        {state.kind === "done" && state.results.length === 0 && <p className="py-3 text-sm text-ink-2">{t("search.noResults")}</p>}
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
                      <span className="block truncate text-meta text-ink-2" lang="de">
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
