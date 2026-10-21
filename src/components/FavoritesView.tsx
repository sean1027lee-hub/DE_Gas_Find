"use client";
import { useEffect, useMemo, useState } from "react";
import { formatAge, formatClock } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { rankStations, type DiscountRules } from "@/lib/pricing";
import { favoritesStore } from "@/lib/store";
import { FUEL_LABELS, type Fuel, type PricesResponse, type Station } from "@/lib/types";
import { RefreshIcon, StarIcon } from "./icons";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { StationRow } from "./StationRow";
import { stationTitle, nameWithoutBrand } from "./station-text";

interface FavoritesViewProps {
  fuel: Fuel;
  rules: DiscountRules;
  origin: LatLng | null;
  now: Date;
  onSelect: (station: Station, fetchedAt: string | null) => void;
}

/** Saved stations, refreshed in one prices.php round trip (server batches by 10). */
export function FavoritesView({ fuel, rules, origin, now, onSelect }: FavoritesViewProps) {
  const favorites = favoritesStore.use();
  const [reload, setReload] = useState(0);
  const idsKey = favorites.map((f) => f.station.id).sort().join(",");
  const requestKey = `${idsKey}#${reload}`;
  const [response, setResponse] = useState<{ key: string; failed: boolean } | null>(null);
  // Keep the last good prices while a new request is in flight.
  const [prices, setPrices] = useState<PricesResponse | null>(null);

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetch(`/api/prices?ids=${idsKey}`, { signal: AbortSignal.timeout(10_000) })
      .then((res) => (res.ok ? (res.json() as Promise<PricesResponse>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setPrices(data);
        setResponse({ key: requestKey, failed: false });
      })
      .catch(() => !cancelled && setResponse({ key: requestKey, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [idsKey, requestKey]);

  const settled = response?.key === requestKey;
  const state: "idle" | "loading" | "error" = !settled ? "loading" : response.failed ? "error" : "idle";
  const load = () => setReload((n) => n + 1);

  const stations: Station[] = useMemo(
    () =>
      favorites.map(({ station }) => {
        const update = prices?.prices[station.id];
        if (!update) return station;
        return {
          ...station,
          isOpen: update.status === "open",
          prices: update.status === "open" || update.status === "closed" ? { ...station.prices, ...pickPrices(update.prices) } : station.prices,
        };
      }),
    [favorites, prices],
  );

  const result = useMemo(
    () =>
      rankStations(stations, {
        fuel,
        rules,
        origin: origin ?? stations[0] ?? { lat: 0, lng: 0 },
        radiusKm: Infinity,
        sort: "price",
      }),
    [stations, fuel, rules, origin],
  );
  const withoutPrice = stations.filter((s) => s.prices[fuel] === null);
  const fetchedAt = prices ? new Date(prices.fetchedAt) : null;

  if (favorites.length === 0) {
    return (
      <StatusMessage
        icon={<StarIcon size={22} />}
        title="아직 즐겨찾기한 주유소가 없어요"
        description="자주 가는 주유소를 눌러 상세 화면에서 ☆를 누르면 여기서 가격을 한 번에 볼 수 있어요."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4">
        <p className="text-[14px] text-ink-2">
          {FUEL_LABELS[fuel]} · {favorites.length}곳
        </p>
        <button
          type="button"
          onClick={load}
          disabled={state === "loading"}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-ink-2 active:bg-surface-2"
          aria-label="즐겨찾기 가격 새로고침"
        >
          <span className="tnum">{fetchedAt ? `${formatClock(fetchedAt)} 기준 · ${formatAge(fetchedAt, now)}` : "–"}</span>
          <RefreshIcon size={16} className={state === "loading" ? "animate-spin-slow" : ""} />
        </button>
      </div>
      {state === "error" && (
        <p className="mx-4 mb-2 rounded-[12px] bg-warn-soft px-3.5 py-2.5 text-[14px] text-warn-ink" role="status">
          가격을 새로 불러오지 못했어요. 마지막으로 본 가격을 보여드려요.
        </p>
      )}
      <ul className="mx-4 mt-1 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" aria-busy={state === "loading" && !prices}>
        {!prices && state === "loading"
          ? favorites.map((f) => <RowSkeleton key={f.station.id} />)
          : [...result.open, ...result.closed].map((item) => (
              <StationRow
                key={item.station.id}
                item={{ ...item, distanceKm: origin ? item.distanceKm : NaN }}
                favorite={false}
                onSelect={() => onSelect(item.station, prices?.fetchedAt ?? null)}
              />
            ))}
        {withoutPrice.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s, prices?.fetchedAt ?? null)}
              className="flex min-h-[64px] w-full items-center justify-between gap-3 py-3 pr-4 pl-7 text-left opacity-70"
            >
              <span className="truncate" lang="de">
                <strong className="font-semibold">{stationTitle(s)}</strong>{" "}
                <span className="text-ink-2">{s.brand ? nameWithoutBrand(s) : ""}</span>
              </span>
              <span className="shrink-0 text-[13px] text-ink-2">{FUEL_LABELS[fuel]} 없음</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function pickPrices(p: Station["prices"]): Partial<Station["prices"]> {
  // A closed station reports no prices; keep the last known ones rather than blanking.
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null));
}
