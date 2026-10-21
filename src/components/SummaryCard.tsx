import { formatCt, formatDistance, formatEuro, priceString } from "@/lib/format";
import { savingsVsAverage, type RankedStation } from "@/lib/pricing";
import { FUEL_LABELS, type Fuel } from "@/lib/types";
import { Price } from "./Price";
import { ChevronRightIcon } from "./icons";
import { nameWithoutBrand, stationTitle } from "./station-text";

interface SummaryCardProps {
  cheapest: RankedStation;
  average: number | null;
  count: number;
  fuel: Fuel;
  radiusKm: number;
  litres: number;
  stale: boolean;
  onSelect: () => void;
}

/** The answer to "where is it cheapest?" — styled like a fuel price sign. */
export function SummaryCard({ cheapest, average, count, fuel, radiusKm, litres, stale, onSelect }: SummaryCardProps) {
  const { station, price, pumpPrice, discount, distanceKm } = cheapest;
  const savings = average !== null ? savingsVsAverage(price, average, litres) : 0;
  const perLitre = average !== null ? average - price : 0;
  const subtitle = station.brand ? nameWithoutBrand(station) : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full overflow-hidden rounded-[var(--radius-card)] bg-board text-left text-board-ink ring-1 ring-board-line transition-opacity active:opacity-90 ${stale ? "opacity-70" : ""}`}
      aria-describedby="summary-hint"
    >
      <span className="flex items-center justify-between px-4 pt-3.5 text-[13px] text-board-ink-2">
        <span>
          가장 싼 곳 · {FUEL_LABELS[fuel]} · {radiusKm} km 이내
        </span>
        <ChevronRightIcon size={18} />
      </span>
      <span className="flex items-end justify-between gap-3 px-4 pt-1">
        <Price
          price={price}
          label={discount > 0 ? "카드 적용 예상가" : "최저가"}
          className="text-[56px] leading-[1.05] font-bold tracking-[-0.03em]"
        />
        <span className="tnum pb-2 text-right text-[15px] font-medium text-board-ink">
          {formatDistance(distanceKm)}
        </span>
      </span>
      <span className="block truncate px-4 text-[16px]">
        <strong className="font-semibold" lang="de">
          {stationTitle(station)}
        </strong>
        {subtitle && (
          <span className="ml-1.5 text-board-ink-2" lang="de">
            {subtitle}
          </span>
        )}
      </span>
      {discount > 0 && (
        <span className="mt-1 block px-4 text-[13px] text-board-ink-2">
          카드 <span className="num">−{formatCt(discount)}</span> 적용 예상가 · 주유기 표시 <span className="num">{priceString(pumpPrice)}</span>
        </span>
      )}
      <span id="summary-hint" className="mt-3 block border-t border-board-line px-4 py-2.5 text-[14px] text-board-ink">
        {count <= 1 || savings <= 0 ? (
          count <= 1 ? (
            "이 반경에 영업 중인 주유소가 한 곳이에요"
          ) : (
            "주변 가격이 모두 같아요"
          )
        ) : (
          <>
            평균보다 리터당 {formatCt(perLitre)} 저렴 · {litres}L 주유 시{" "}
            <strong className="font-semibold">{formatEuro(savings)} 절약</strong>
          </>
        )}
      </span>
    </button>
  );
}

export function SummarySkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-board p-4 ring-1 ring-board-line" aria-hidden="true">
      <div className="h-3.5 w-44 rounded bg-board-line" />
      <div className="mt-3 h-12 w-48 rounded bg-board-line" />
      <div className="mt-3 h-4 w-56 rounded bg-board-line" />
      <div className="mt-5 h-4 w-64 rounded bg-board-line" />
    </div>
  );
}
