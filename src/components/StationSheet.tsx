"use client";
import { useEffect, useState } from "react";
import { formatClock, formatDistance, formatAge } from "@/lib/format";
import { distanceKm, type LatLng } from "@/lib/geo";
import { NAV_APP_LABELS, navUrl, type NavApp } from "@/lib/nav";
import { FUEL_LABELS, FUELS, type Fuel, type Station, type StationDetail } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button, LinkButton } from "./Button";
import { Price } from "./Price";
import { ClockIcon, NavigationIcon, PinIcon, StarIcon } from "./icons";
import { stationAddress, stationTitle, nameWithoutBrand } from "./station-text";

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
    fetch(`/api/station?id=${id}`, { signal: AbortSignal.timeout(8000) })
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

export function StationSheet({
  station,
  fuel,
  origin,
  fetchedAt,
  navApp,
  favorite,
  onToggleFavorite,
  onClose,
}: StationSheetProps) {
  const { detail, loading, failed } = useDetail(station?.id);
  if (!station) return null;

  const other: NavApp = navApp === "apple" ? "google" : "apple";
  const label = `${stationTitle(station)} ${nameWithoutBrand(station)}`.trim();
  const fetched = fetchedAt ? new Date(fetchedAt) : null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={
        <span className="block">
          <span className="block text-[13px] font-medium text-ink-2">
            {station.isOpen ? "영업 중" : "영업 종료"}
            {origin && <> · {formatDistance(distanceKm(origin, station))}</>}
          </span>
          <span className="mt-0.5 block text-[21px] leading-tight" lang="de">
            {stationTitle(station)}
            {station.brand && <span className="font-medium text-ink-2"> {nameWithoutBrand(station)}</span>}
          </span>
        </span>
      }
      footer={
        <div className="flex gap-2">
          <LinkButton href={navUrl(navApp, station, label)} target="_blank" rel="noopener" className="flex-1">
            <NavigationIcon size={19} />
            {NAV_APP_LABELS[navApp]}로 길안내
          </LinkButton>
          <Button
            variant="secondary"
            onClick={() => onToggleFavorite(station)}
            aria-pressed={favorite}
            aria-label={favorite ? "즐겨찾기에서 빼기" : "즐겨찾기에 추가"}
            className="w-14 px-0"
          >
            <StarIcon size={22} filled={favorite} className={favorite ? "text-ink" : "text-ink-2"} />
          </Button>
        </div>
      }
    >
      <ul className="grid grid-cols-3 gap-2" aria-label="연료별 가격">
        {FUELS.map((f) => {
          const pump = station.prices[f];
          const selected = f === fuel;
          return (
            <li
              key={f}
              className={`flex flex-col rounded-[12px] px-2.5 pt-2 pb-2.5 ${
                selected ? "bg-board text-board-ink ring-2 ring-accent" : "bg-surface-2"
              }`}
            >
              <span className={`text-[12px] font-semibold ${selected ? "text-board-ink-2" : "text-ink-2"}`} lang="de">
                {FUEL_LABELS[f]}
                {selected && <span className="sr-only"> (선택한 연료)</span>}
              </span>
              {pump === null ? (
                <span className={`mt-1 text-[14px] ${selected ? "text-board-ink-2" : "text-ink-3"}`}>판매 안 함</span>
              ) : (
                <Price price={pump} label="가격" className="mt-0.5 text-[22px] leading-tight font-bold" />
              )}
            </li>
          );
        })}
      </ul>


      <dl className="mt-4 divide-y divide-line text-[15px]">
        <div className="flex gap-3 py-3">
          <dt className="pt-0.5 text-ink-2">
            <PinIcon size={18} />
            <span className="sr-only">주소</span>
          </dt>
          <dd lang="de">{stationAddress(station)}</dd>
        </div>
        <div className="flex gap-3 py-3">
          <dt className="pt-0.5 text-ink-2">
            <ClockIcon size={18} />
            <span className="sr-only">영업시간</span>
          </dt>
          <dd className="flex-1">
            {loading && <span className="skeleton block h-4 w-40" aria-label="영업시간 불러오는 중" />}
            {failed && <span className="text-ink-2">영업시간을 불러오지 못했어요.</span>}
            {detail && detail.wholeDay && <span>24시간 영업</span>}
            {detail && !detail.wholeDay && detail.openingTimes.length === 0 && (
              <span className="text-ink-2">영업시간 정보가 없어요.</span>
            )}
            {detail && !detail.wholeDay && detail.openingTimes.length > 0 && (
              <ul className="space-y-0.5">
                {detail.openingTimes.map((t, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span lang="de">{t.text}</span>
                    <span className="tnum">
                      {hhmm(t.start)}–{hhmm(t.end)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {detail && detail.overrides.length > 0 && (
              <p className="mt-1 text-[13px] text-ink-2" lang="de">
                {detail.overrides.join(" · ")}
              </p>
            )}
          </dd>
        </div>
      </dl>

      {fetched && (
        <p className="mt-2 text-[13px] text-ink-3">
          가격 {formatClock(fetched)} 기준({formatAge(fetched)}) · MTS-K
        </p>
      )}
      <p className="mt-3 text-[14px]">
        <a
          href={navUrl(other, station, label)}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
        >
          {NAV_APP_LABELS[other]}로 열기
        </a>
      </p>
    </BottomSheet>
  );
}
