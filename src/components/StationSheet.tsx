"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { ageParts, formatClock, formatDistance } from "@/lib/format";
import { distanceKm, type LatLng } from "@/lib/geo";
import { navUrl, type NavApp } from "@/lib/nav";
import { apiQuery } from "@/lib/scenario";
import { FUEL_LABELS, FUELS, type Fuel, type Station, type StationDetail } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button, LinkButton } from "./Button";
import { ClockIcon, NavigationIcon, PinIcon, StarIcon } from "./icons";
import { Price } from "./Price";
import { nameWithoutBrand, stationAddress, stationTitle } from "./station-text";

interface StationSheetProps {
  station: Station | null;
  fuel: Fuel;
  origin: LatLng | null;
  fetchedAt: string | null;
  navApp: NavApp;
  favorite: boolean;
  onToggleFavorite: (station: Station) => void;
  onClose: () => void;
}

const detailCache = new Map<string, StationDetail>();

function useDetail(id: string | undefined) {
  const [state, setState] = useState<{ id: string; detail: StationDetail | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!id || detailCache.has(id)) return;
    let cancelled = false;
    fetch(`/api/station?id=${id}${apiQuery()}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<StationDetail>) : Promise.reject()))
      .then((detail) => {
        detailCache.set(id, detail);
        if (!cancelled) setState({ id, detail, failed: false });
      })
      .catch(() => !cancelled && setState({ id, detail: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (!id) return { detail: null, loading: false, failed: false };
  const cached = detailCache.get(id);
  if (cached) return { detail: cached, loading: false, failed: false };
  const current = state?.id === id ? state : null;
  return { detail: current?.detail ?? null, loading: !current, failed: current?.failed ?? false };
}

const hhmm = (t: string) => t.slice(0, 5);

export function StationSheet({ station, fuel, origin, fetchedAt, navApp, favorite, onToggleFavorite, onClose }: StationSheetProps) {
  const { t } = useT();
  const { detail, loading, failed } = useDetail(station?.id);
  if (!station) return null;

  const other: NavApp = navApp === "apple" ? "google" : "apple";
  const appName = (a: NavApp) => t(a === "apple" ? "nav.apple" : "nav.google");
  const label = `${stationTitle(station)} ${nameWithoutBrand(station)}`.trim();
  const fetched = fetchedAt ? new Date(fetchedAt) : null;
  const age = fetched ? ageParts(fetched) : null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={
        <span className="block">
          <span className="block text-meta font-medium text-ink-2">
            {t(station.isOpen ? "status.open" : "status.closed")}
            {origin && <> · {formatDistance(distanceKm(origin, station))}</>}
          </span>
          <span className="mt-0.5 block text-h2 leading-tight" lang="de">
            {stationTitle(station)}
            {station.brand && <span className="font-medium text-ink-2"> {nameWithoutBrand(station)}</span>}
          </span>
        </span>
      }
      footer={
        <div className="flex gap-2">
          <LinkButton href={navUrl(navApp, station, label)} target="_blank" rel="noopener" className="flex-1">
            <NavigationIcon size={19} />
            {t("sheet.navWith", { app: appName(navApp) })}
          </LinkButton>
          <Button
            variant="secondary"
            onClick={() => onToggleFavorite(station)}
            aria-pressed={favorite}
            aria-label={t(favorite ? "sheet.favRemove" : "sheet.favAdd")}
            className="w-14 px-0"
          >
            <StarIcon size={22} filled={favorite} className={favorite ? "text-ink" : "text-ink-2"} />
          </Button>
        </div>
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-2" aria-label={t("sheet.fuelPrices")}>
        {FUELS.map((f) => {
          const pump = station.prices[f];
          const selected = f === fuel;
          return (
            <li
              key={f}
              className={`flex flex-col rounded-[12px] px-2.5 pt-2 pb-2.5 ${selected ? "bg-board text-board-ink ring-2 ring-accent" : "bg-surface-2"}`}
            >
              <span className={`text-xs font-semibold ${selected ? "text-board-ink-2" : "text-ink-2"}`} lang="de">
                {FUEL_LABELS[f]}
                {selected && <span className="sr-only"> {t("sheet.selectedFuel")}</span>}
              </span>
              {pump === null ? (
                <span className={`mt-1 text-sm ${selected ? "text-board-ink-2" : "text-ink-3"}`}>{t("sheet.notSold")}</span>
              ) : (
                <Price price={pump} className="mt-0.5 text-price-sm leading-tight font-extrabold" />
              )}
            </li>
          );
        })}
      </ul>

      <dl className="mt-4 divide-y divide-line text-ui">
        <div className="flex gap-3 py-3">
          <dt className="pt-0.5 text-ink-2">
            <PinIcon size={18} />
            <span className="sr-only">{t("sheet.address")}</span>
          </dt>
          <dd lang="de">{stationAddress(station)}</dd>
        </div>
        <div className="flex gap-3 py-3">
          <dt className="pt-0.5 text-ink-2">
            <ClockIcon size={18} />
            <span className="sr-only">{t("sheet.hours")}</span>
          </dt>
          <dd className="flex-1">
            {loading && <span className="skeleton block h-4 w-40" role="status" aria-label={t("sheet.hoursLoading")} />}
            {failed && <span className="text-ink-2">{t("sheet.hoursFailed")}</span>}
            {detail && detail.wholeDay && <span>{t("sheet.h24")}</span>}
            {detail && !detail.wholeDay && detail.openingTimes.length === 0 && <span className="text-ink-2">{t("sheet.noHours")}</span>}
            {detail && !detail.wholeDay && detail.openingTimes.length > 0 && (
              <ul className="space-y-0.5">
                {detail.openingTimes.map((o, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-x-4">
                    <span lang="de">{o.text}</span>
                    <span className="tnum">
                      {hhmm(o.start)}–{hhmm(o.end)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {detail && detail.overrides.length > 0 && (
              <p className="mt-1 text-meta text-ink-2" lang="de">
                {detail.overrides.join(" · ")}
              </p>
            )}
          </dd>
        </div>
      </dl>

      {fetched && age && (
        <p className="mt-2 text-meta text-ink-3">{t("sheet.asOf", { time: formatClock(fetched), age: t(age.key, { n: age.n }) })}</p>
      )}
      <p className="mt-3 text-sm">
        <a
          href={navUrl(other, station, label)}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t("sheet.openWith", { app: appName(other) })}
        </a>
      </p>
    </BottomSheet>
  );
}
