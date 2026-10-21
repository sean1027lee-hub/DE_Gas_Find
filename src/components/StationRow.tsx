"use client";
import { useT } from "@/i18n";
import { formatCtDiff, formatDistance } from "@/lib/format";
import type { RankedStation } from "@/lib/pricing";
import { FUEL_LABELS, type Fuel } from "@/lib/types";
import { StarIcon } from "./icons";
import { AnimatedPrice } from "./Price";
import { nameWithoutBrand, stationTitle } from "./station-text";
import { TierBadge } from "./Tier";

interface StationRowProps {
  item: RankedStation;
  fuel: Fuel;
  favorite: boolean;
  onSelect: () => void;
}

/**
 * One station. The whole row is one button whose accessible name is a single
 * sentence ("Aral Heidelberger Str., 1,2 km, Super E10 1,739 Euro, cheapest nearby").
 * With large system text the price wraps under the name instead of squeezing it.
 */
export function StationRow({ item, fuel, favorite, onSelect }: StationRowProps) {
  const { t } = useT();
  const { station, price, distanceKm, diffToMin, tier, isCheapest } = item;
  const closed = !station.isOpen;
  const title = stationTitle(station);
  const subtitle = station.brand ? nameWithoutBrand(station) : "";
  const best = !closed && (isCheapest || diffToMin === 0);
  const hasDistance = Number.isFinite(distanceKm);

  // Closed is already visible text; only add what the screen doesn't say in words.
  const status = closed
    ? ""
    : best
      ? t("a11y.cheapestNearby")
      : `${t("a11y.aboveCheapest", { diff: formatCtDiff(diffToMin).replace("+", "") })} (${t(`tier.${tier}`)})`;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-h-[4.75rem] w-full flex-wrap items-center gap-x-3 gap-y-1 py-3 pr-4 pl-4 text-left transition-colors active:bg-surface-2 ${closed ? "opacity-60" : ""}`}
      >
        {/* Accessible name = visible text + hidden connectors, read as one sentence (WCAG 2.5.3). */}
        <span className="flex min-w-[min(100%,11rem)] flex-1 flex-col justify-center gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-base leading-tight">
              <strong className="font-semibold" lang="de">
                {title}
              </strong>
              {subtitle && (
                <span className="ml-1.5 text-ink-2" lang="de">
                  {subtitle}
                </span>
              )}
            </span>
            {favorite && <StarIcon filled size={14} className="shrink-0 text-ink-2" />}
          </span>
          <span className="sr-only">, </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-meta text-ink-2">
            {hasDistance && <span className="tnum">{formatDistance(distanceKm)}</span>}
            {hasDistance && closed && <span>·</span>}
            {closed && <span className="font-medium text-ink">{t("status.closed")}</span>}
            {!closed && !hasDistance && <span>{t("status.open")}</span>}
          </span>
          <span className="sr-only">, {FUEL_LABELS[fuel]} </span>
        </span>
        <span className="ml-auto flex shrink-0 flex-col items-end justify-center gap-1">
          <AnimatedPrice price={price} className="text-price leading-none font-extrabold" />
          <span className="sr-only">
            {status && `, ${status}`}
            {favorite ? `, ${t("a11y.favorite")}` : ""}
          </span>
          <span aria-hidden="true" className="contents">
            {!closed &&
              (best ? (
                <TierBadge tier="low">{t("tier.cheapest")}</TierBadge>
              ) : (
                <TierBadge tier={tier}>
                  <span className="tnum">{formatCtDiff(diffToMin)}</span>
                </TierBadge>
              ))}
          </span>
        </span>
      </button>
    </li>
  );
}
