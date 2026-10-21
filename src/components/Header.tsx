"use client";
import { useT } from "@/i18n";
import { ageParts, formatClock } from "@/lib/format";
import type { LocationMode } from "@/lib/store";
import { ChevronDownIcon, HomeIcon, LocateIcon, OfflineIcon, PinIcon, RefreshIcon } from "./icons";

interface HeaderProps {
  locationLabel: string;
  locationMode: LocationMode | null;
  locating: boolean;
  onLocationClick: () => void;
  fetchedAt: Date | null;
  now: Date;
  refreshing: boolean;
  stale: boolean;
  offline: boolean;
  onRefresh: () => void;
}

/** Top = information: where, and how fresh the prices are. */
export function Header({
  locationLabel,
  locationMode,
  locating,
  onLocationClick,
  fetchedAt,
  now,
  refreshing,
  stale,
  offline,
  onRefresh,
}: HeaderProps) {
  const { t } = useT();
  const LocIcon = locationMode === "home" ? HomeIcon : locationMode === "place" ? PinIcon : LocateIcon;
  const time = fetchedAt ? formatClock(fetchedAt) : null;
  const age = fetchedAt ? ageParts(fetchedAt, now) : null;
  const ageText = age ? t(age.key, { n: age.n }) : "";
  const text = !time
    ? refreshing
      ? t("common.loading")
      : "–"
    : offline
      ? t("header.offlineAsOf", { time })
      : stale
        ? t("header.staleRefresh", { age: ageText })
        : t("header.asOf", { time });

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-2 px-3 py-1">
      <button
        type="button"
        onClick={onLocationClick}
        className="flex min-h-11 min-w-[min(100%,10rem)] flex-1 items-center gap-2 rounded-[10px] px-2 text-left active:bg-surface-2"
        aria-label={t("header.locationAria", { place: locationLabel })}
      >
        <LocIcon size={19} className={`shrink-0 text-accent ${locating ? "animate-spin-slow" : ""}`} />
        <span className="truncate text-base font-semibold" lang="de">
          {locating ? t("header.locating") : locationLabel}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-ink-2" />
      </button>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={`ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
          stale || offline ? "bg-warn-soft text-warn-ink" : "text-ink-2 active:bg-surface-2"
        }`}
        aria-label={time ? t("header.refreshAria", { time, age: ageText }) : t("header.refresh")}
      >
        {offline && <OfflineIcon size={16} />}
        <span className="tnum">{text}</span>
        {!offline && <RefreshIcon size={16} className={refreshing ? "animate-spin-slow" : ""} />}
      </button>
    </div>
  );
}
