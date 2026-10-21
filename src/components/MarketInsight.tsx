"use client";
import { useT } from "@/i18n";
import { benchmarkFuel, seriesOf, verdictFor, windowStats, type Benchmarks } from "@/lib/benchmarks";
import { formatCt, formatLitrePrice, formatMonthDay } from "@/lib/format";
import type { Fuel } from "@/lib/types";
import { ChevronRightIcon } from "./icons";
import { TierBadge } from "./Tier";

interface MarketInsightProps {
  data: Benchmarks;
  fuel: Fuel;
  /** Cheapest nearby price, compared with the national average (not for E10: no E10 series). */
  localCheapest: number | null;
  onOpen: () => void;
}

/** One-line market context: is the national price high or low right now? */
export function MarketInsight({ data, fuel, localCheapest, onOpen }: MarketInsightProps) {
  const { t, lang } = useT();
  const stats = windowStats(seriesOf(data, benchmarkFuel(fuel)), 3);
  if (!stats) return null;
  const verdict = verdictFor(stats.percentile);
  const vsNational = fuel !== "e10" && localCheapest !== null ? localCheapest - stats.latest.price : null;
  const fuelName = t(fuel === "diesel" ? "fuelGroup.diesel" : "fuelGroup.petrol");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left active:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-ink-2">
            {t("insight.national", { fuel: fuelName, price: "" })}
            <span className="tnum font-semibold text-ink">{formatLitrePrice(stats.latest.price)}</span>
          </span>
          <TierBadge tier={verdict}>{t("insight.verdict", { verdict: t(`verdict.${verdict}`) })}</TierBadge>
        </span>
        <span className="mt-0.5 block text-meta text-ink-2">
          {vsNational !== null
            ? t(vsNational <= 0 ? "insight.cheaper" : "insight.pricier", { ct: formatCt(Math.abs(vsNational)) })
            : t("insight.fallback", { price: formatLitrePrice(stats.average) })}
          <span className="text-ink-3"> · {t("insight.week", { date: formatMonthDay(stats.latest.date, lang) })}</span>
        </span>
      </span>
      <ChevronRightIcon size={18} className="shrink-0 text-ink-3" />
    </button>
  );
}
