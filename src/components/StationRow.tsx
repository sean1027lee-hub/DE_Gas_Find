import { formatCtDiff, formatDistance } from "@/lib/format";
import type { PriceTier, RankedStation } from "@/lib/pricing";
import { Price } from "./Price";
import { StarIcon } from "./icons";
import { nameWithoutBrand, stationTitle } from "./station-text";

export const TIER_BAR: Record<PriceTier, string> = {
  low: "bg-low",
  mid: "bg-mid",
  high: "bg-high",
};

export const TIER_LABEL: Record<PriceTier, string> = {
  low: "저렴",
  mid: "보통",
  high: "비쌈",
};

interface StationRowProps {
  item: RankedStation;
  favorite: boolean;
  onSelect: () => void;
}

export function StationRow({ item, favorite, onSelect }: StationRowProps) {
  const { station, price, distanceKm, diffToMin, tier, isCheapest } = item;
  const closed = !station.isOpen;
  const title = stationTitle(station);
  const subtitle = station.brand ? nameWithoutBrand(station) : "";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group flex min-h-[76px] w-full items-stretch gap-3 py-3 pr-4 pl-3 text-left transition-colors active:bg-surface-2 ${closed ? "opacity-60" : ""}`}
      >
        <span
          className={`w-1 shrink-0 rounded-full ${closed ? "bg-surface-3" : TIER_BAR[tier]}`}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[16px] leading-tight">
              <strong className="font-semibold" lang="de">
                {title}
              </strong>
              {subtitle && (
                <span className="ml-1.5 text-ink-2" lang="de">
                  {subtitle}
                </span>
              )}
            </span>
            {favorite && <StarIcon filled size={14} className="shrink-0 text-ink-2" aria-label="즐겨찾기" />}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
            {Number.isFinite(distanceKm) && <span className="tnum">{formatDistance(distanceKm)}</span>}
            {closed && (
              <>
                {Number.isFinite(distanceKm) && <span aria-hidden="true">·</span>}
                <span className="font-medium text-ink">영업 종료</span>
              </>
            )}
            {!closed && !Number.isFinite(distanceKm) && <span>영업 중</span>}
            {!closed && <span className="sr-only">영업 중, 가격 {TIER_LABEL[tier]}</span>}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end justify-center gap-1">
          <Price
            price={price}
            label="가격"
            className="text-[27px] leading-none font-bold"
          />
          {isCheapest || (!closed && diffToMin === 0) ? (
            <span className="rounded-md bg-low-soft px-1.5 py-0.5 text-[12px] font-bold text-low">최저</span>
          ) : (
            !closed && (
              <span className="num text-[13px] font-medium text-ink-2">
                <span className="sr-only">최저가보다 </span>
                {formatCtDiff(diffToMin)}
              </span>
            )
          )}
        </span>
      </button>
    </li>
  );
}
