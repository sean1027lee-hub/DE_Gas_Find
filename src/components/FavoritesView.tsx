"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n";
import { ageParts, formatClock } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { rankStations } from "@/lib/pricing";
import { apiQuery } from "@/lib/scenario";
import { favoritesStore } from "@/lib/store";
import { FUEL_LABELS, type Fuel, type PricesResponse, type Station } from "@/lib/types";
import { RefreshIcon, StarIcon } from "./icons";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { StationRow } from "./StationRow";
import { nameWithoutBrand, stationTitle } from "./station-text";

interface FavoritesViewProps {
  fuel: Fuel;
  origin: LatLng | null;
  now: Date;
  onSelect: (station: Station, fetchedAt: string | null) => void;
}

const LIST = "mx-4 mt-1 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface";

/** Saved stations, refreshed in one prices.php round trip (server batches by 10). */
export function FavoritesView({ fuel, origin, now, onSelect }: FavoritesViewProps) {
  const { t } = useT();
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
    fetch(`/api/prices?ids=${idsKey}${apiQuery()}`, { signal: AbortSignal.timeout(10_000) })
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

  const stations: Station[] = useMemo(
    () =>
      favorites.map(({ station }) => {
        const update = prices?.prices[station.id];
        if (!update) return station;
        // A closed station reports no prices; keep the last known ones rather than blanking.
        const fresh = Object.fromEntries(Object.entries(update.prices).filter(([, v]) => v !== null));
        return { ...station, isOpen: update.status === "open", prices: { ...station.prices, ...fresh } };
      }),
    [favorites, prices],
  );

  const result = useMemo(
    () => rankStations(stations, { fuel, origin: origin ?? stations[0] ?? { lat: 0, lng: 0 }, radiusKm: Infinity, sort: "price" }),
    [stations, fuel, origin],
  );
  const withoutPrice = stations.filter((s) => s.prices[fuel] === null);
  const fetchedAt = prices ? new Date(prices.fetchedAt) : null;
  const age = fetchedAt ? ageParts(fetchedAt, now) : null;

  if (favorites.length === 0) {
    return <StatusMessage icon={<StarIcon size={22} />} title={t("fav.emptyTitle")} description={t("fav.emptyDesc")} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4">
        <p className="text-sm text-ink-2">{t("fav.count", { fuel: FUEL_LABELS[fuel], n: favorites.length })}</p>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          disabled={state === "loading"}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 active:bg-surface-2"
          aria-label={t("fav.refreshAria")}
        >
          <span className="tnum">
            {fetchedAt && age ? `${t("header.asOf", { time: formatClock(fetchedAt) })} · ${t(age.key, { n: age.n })}` : "–"}
          </span>
          <RefreshIcon size={16} className={state === "loading" ? "animate-spin-slow" : ""} />
        </button>
      </div>
      {state === "error" && (
        <p className="mx-4 mb-2 rounded-[12px] bg-warn-soft px-3.5 py-2.5 text-sm text-warn-ink" role="status">
          {t("fav.refreshFailed")}
        </p>
      )}
      <ul className={LIST} aria-busy={state === "loading" && !prices}>
        {!prices && state === "loading"
          ? favorites.map((f) => <RowSkeleton key={f.station.id} />)
          : [...result.open, ...result.closed].map((item) => (
              <StationRow
                key={item.station.id}
                item={{ ...item, distanceKm: origin ? item.distanceKm : NaN }}
                fuel={fuel}
                favorite={false}
                onSelect={() => onSelect(item.station, prices?.fetchedAt ?? null)}
              />
            ))}
        {withoutPrice.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s, prices?.fetchedAt ?? null)}
              className="flex min-h-16 w-full flex-wrap items-center justify-between gap-x-3 py-3 pr-4 pl-4 text-left opacity-70"
            >
              <span className="truncate" lang="de">
                <strong className="font-semibold">{stationTitle(s)}</strong>{" "}
                <span className="text-ink-2">{s.brand ? nameWithoutBrand(s) : ""}</span>
              </span>
              <span className="shrink-0 text-meta text-ink-2">{t("fav.noFuel", { fuel: FUEL_LABELS[fuel] })}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
