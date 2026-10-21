"use client";
import { formatAge, formatClock } from "@/lib/format";
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
  const LocIcon = locationMode === "home" ? HomeIcon : locationMode === "place" ? PinIcon : LocateIcon;
  const timeText = fetchedAt ? `${formatClock(fetchedAt)} 기준` : refreshing ? "불러오는 중" : "–";

  return (
    <div className="flex h-14 items-center gap-2 px-3">
      <button
        type="button"
        onClick={onLocationClick}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] px-2 text-left active:bg-surface-2"
        aria-label={`기준 위치: ${locationLabel}. 위치 바꾸기`}
      >
        <LocIcon size={19} className={`shrink-0 text-accent ${locating ? "animate-spin-slow" : ""}`} />
        <span className="truncate text-[16px] font-semibold" lang="de">
          {locating ? "위치 찾는 중…" : locationLabel}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-ink-2" />
      </button>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors ${
          stale || offline ? "bg-warn-soft text-warn-ink" : "text-ink-2 active:bg-surface-2"
        }`}
        aria-label={
          fetchedAt
            ? `가격 ${formatClock(fetchedAt)} 기준, ${formatAge(fetchedAt, now)}. 새로고침`
            : "가격 새로고침"
        }
      >
        {offline ? <OfflineIcon size={16} /> : null}
        <span className="tnum">
          {offline ? `오프라인 · ${timeText}` : stale && fetchedAt ? `${formatAge(fetchedAt, now)} · 새로고침` : timeText}
        </span>
        {!offline && <RefreshIcon size={16} className={refreshing ? "animate-spin-slow" : ""} />}
      </button>
    </div>
  );
}
