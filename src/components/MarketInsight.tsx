import { benchmarkFuel, seriesOf, VERDICT_LABELS, verdictFor, windowStats, type Benchmarks } from "@/lib/benchmarks";
import { formatCtDiff, formatLitrePrice, formatMonthDay } from "@/lib/format";
import type { Fuel } from "@/lib/types";
import { ChevronRightIcon } from "./icons";

const BADGE = {
  low: "bg-low-soft text-low",
  mid: "bg-mid-soft text-mid",
  high: "bg-high-soft text-high",
} as const;

interface MarketInsightProps {
  data: Benchmarks;
  fuel: Fuel;
  /** Cheapest nearby price, compared with the national average (not for E10: no E10 series). */
  localCheapest: number | null;
  onOpen: () => void;
}

/** One-line market context under the summary: is now a cheap or an expensive time? */
export function MarketInsight({ data, fuel, localCheapest, onOpen }: MarketInsightProps) {
  const bf = benchmarkFuel(fuel);
  const stats = windowStats(seriesOf(data, bf), 3);
  if (!stats) return null;
  const verdict = verdictFor(stats.percentile);
  const vsNational = fuel !== "e10" && localCheapest !== null ? localCheapest - stats.latest.price : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left active:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
          <span className="text-ink-2">
            독일 평균 {fuel === "diesel" ? "디젤" : "휘발유"}{" "}
            <span className="tnum font-semibold text-ink">{formatLitrePrice(stats.latest.price)}</span>
          </span>
          <span className={`rounded-md px-1.5 py-0.5 text-[12px] font-bold ${BADGE[verdict]}`}>
            3년 중 {VERDICT_LABELS[verdict]}
          </span>
        </span>
        <span className="mt-0.5 block text-[13px] text-ink-2">
          {vsNational !== null
            ? `여기 최저가는 전국 평균보다 리터당 ${formatCtDiff(Math.abs(vsNational)).replace("+", "")} ${vsNational <= 0 ? "싸요" : "비싸요"}`
            : `3년 평균 ${formatLitrePrice(stats.average)} · 이웃 나라와도 비교해 보세요`}
          <span className="text-ink-3"> · {formatMonthDay(stats.latest.date)} 주</span>
        </span>
      </span>
      <ChevronRightIcon size={18} className="shrink-0 text-ink-3" />
    </button>
  );
}
