"use client";
/**
 * "지금 넣을까?" — when to fill up, Apple-Weather style: one sentence first,
 * then the expected direction hour by hour. The 12:00 rule makes the direction
 * fairly reliable, but not the size of each change, so we show directions and
 * ranges only — never a precise future price (see lib/timing.ts).
 */
import { useT } from "@/i18n";
import { formatCt, formatEuroRange } from "@/lib/format";
import { advise, forecast, trendOf, type Curve, type Trend } from "@/lib/timing";
import type { Fuel } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { ChevronRightIcon, ClockIcon } from "./icons";
import { TierIcon } from "./Tier";

export interface TimingModel {
  nowPrice: number;
  nowHour: number;
  curve: Curve;
  fuel: Fuel;
  /** Days of local history behind the curve; null = typical German pattern. */
  learnedDays: number | null;
  /** Share of past predictions whose direction was right (learned curve only). */
  hitRate: number | null;
}

const PHASE_TONE = {
  beforeNoon: "bg-low-soft text-low",
  evening: "bg-low-soft text-low",
  afterRaise: "bg-high-soft text-high",
  night: "bg-mid-soft text-mid",
} as const;

const TREND_TIER = { lower: "low", same: "mid", higher: "high" } as const;

function useAdvice(m: TimingModel, litres: number) {
  const { t } = useT();
  const a = advise(m.nowPrice, m.nowHour, m.curve, m.fuel);
  const hourLabel = (h: number) => t("timing.hour", { h });
  const bestIsTomorrow = a.best.inHours > 0 && Math.floor(m.nowHour) + a.best.inHours >= 24;
  const bestWhen =
    a.best.inHours === 0 ? t("timing.now") : bestIsTomorrow ? t("timing.tomorrow", { when: hourLabel(a.best.hour) }) : hourLabel(a.best.hour);
  const money = a.waitRangeCt ? formatEuroRange((a.waitRangeCt[0] / 100) * litres, (a.waitRangeCt[1] / 100) * litres) : null;
  // Only mention money when it is at least about a euro for a fill-up.
  const worthWaiting = a.waitRangeCt !== null && (a.waitRangeCt[1] / 100) * litres >= 1;
  const extra = worthWaiting
    ? t("timing.waitRange", { when: bestWhen, litres, range: money! })
    : a.noonMaxCt !== null && a.phase === "beforeNoon"
      ? t("timing.noonMax", { ct: formatCt(a.noonMaxCt / 100) })
      : null;
  return {
    a,
    title: t(`timing.${a.phase}.title`),
    sub: t(`timing.${a.phase}.sub`),
    extra,
    hourLabel,
    bestWhen,
    money: worthWaiting ? money : null,
  };
}

export function TimingCard({ model, litres, onOpen }: { model: TimingModel; litres: number; onOpen: () => void }) {
  const { t } = useT();
  const { a, title, sub, extra } = useAdvice(model, litres);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left active:bg-surface-2"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${PHASE_TONE[a.phase]}`} aria-hidden="true">
        <ClockIcon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-meta font-medium text-ink-2">{t("timing.title")}</span>
        <span className="block text-ui leading-snug font-bold">{title}</span>
        <span className="block text-meta leading-snug text-ink-2">{extra ?? sub}</span>
      </span>
      <ChevronRightIcon size={18} className="shrink-0 text-ink-3" />
    </button>
  );
}

const BAR: Record<Trend, string> = {
  lower: "bg-low-solid",
  same: "bg-mid-solid ring-1 ring-inset ring-mid",
  higher: "bg-high-solid",
};
const ICON_TEXT: Record<Trend, string> = { lower: "text-low", same: "text-mid", higher: "text-high" };

export function TimingSheet({
  model,
  litres,
  fuelLabel,
  onClose,
}: {
  model: TimingModel;
  litres: number;
  fuelLabel: string;
  onClose: () => void;
}) {
  const { t } = useT();
  const { a, title, sub, extra, hourLabel, bestWhen, money } = useAdvice(model, litres);
  const points = forecast(model.nowPrice, model.nowHour, model.curve, 24);
  const deltas = points.map((p) => (p.price - model.nowPrice) * 100);
  const lo = Math.min(...deltas);
  const span = Math.max(1, Math.max(...deltas) - lo);

  return (
    <BottomSheet open onClose={onClose} title={t("timing.title")}>
      <p className="text-h2 leading-snug font-extrabold tracking-tight">{title}</p>
      <p className="mt-1 text-ui text-ink-2">{sub}</p>
      {extra && <p className="mt-1 text-ui font-semibold">{extra}</p>}
      {a.phase !== "beforeNoon" && a.noonMaxCt !== null && (
        <p className="mt-1 text-meta text-ink-2">{t("timing.noonMax", { ct: formatCt(a.noonMaxCt / 100) })}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-meta text-ink-2">
        <span>{t("timing.forecastLabel")}</span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">
          {fuelLabel} ·{" "}
          {model.learnedDays && model.hitRate !== null
            ? t("timing.basisLearned", { days: model.learnedDays, hit: model.hitRate })
            : t("timing.basisTypical")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold" aria-hidden="true">
        {(["lower", "same", "higher"] as Trend[]).map((tr) => (
          <span key={tr} className={`flex items-center gap-1 ${ICON_TEXT[tr]}`}>
            <TierIcon tier={TREND_TIER[tr]} size={10} />
            {t(`timing.trendShort.${tr}`)}
          </span>
        ))}
      </div>

      <ol
        className="scrollbar-none -mx-5 mt-2 flex snap-x gap-1.5 overflow-x-auto px-5 pb-1"
        aria-label={t("timing.chartAria")}
        tabIndex={0}
      >
        {points.map((p, i) => {
          const trend: Trend = i === 0 ? "same" : trendOf(deltas[i]);
          // Height shows the shape only (relative to the next 24 h); no price values.
          const height = 18 + ((deltas[i] - lo) / span) * 82;
          const label = p.inHours === 0 ? t("timing.now") : hourLabel(p.hour);
          return (
            <li key={p.inHours} className="flex w-11 shrink-0 snap-start flex-col items-center gap-1">
              <span className="sr-only">{i === 0 ? label : `${label}: ${t(`timing.trend.${trend}`)}`}</span>
              <span className="flex h-24 w-full items-end justify-center" aria-hidden="true">
                <span
                  className={`w-7 rounded-t-[6px] rounded-b-[2px] ${i === 0 ? "bg-surface-3 outline-2 outline-offset-2 outline-accent" : BAR[trend]}`}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span className={`h-2.5 ${i === 0 ? "" : ICON_TEXT[trend]}`} aria-hidden="true">
                {i > 0 && <TierIcon tier={TREND_TIER[trend]} size={10} />}
              </span>
              <span
                className={`tnum text-2xs whitespace-nowrap ${p.inHours === 0 ? "font-extrabold text-accent" : "text-ink-2"}`}
                aria-hidden="true"
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
        <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
          <dt className="text-xs font-medium text-ink-2">{t("timing.factBest")}</dt>
          <dd className="mt-0.5 text-title font-bold">{bestWhen}</dd>
        </div>
        <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
          <dt className="text-xs font-medium text-ink-2">{t("timing.factLitres", { litres })}</dt>
          <dd className="tnum mt-0.5 text-title font-bold">
            {money ? t("timing.factRange", { range: money }) : t("timing.noDiff")}
          </dd>
        </div>
      </dl>

      <h3 className="mt-5 text-ui font-bold">{t("timing.why")}</h3>
      <p className="mt-1 text-meta font-semibold text-ink-2">{t("timing.ruleBasis")}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("timing.whyRule")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{t("timing.whyRange")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {model.learnedDays && model.hitRate !== null
          ? t("timing.whyLearned", { days: model.learnedDays, hit: model.hitRate })
          : t("timing.whyTypical")}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">{t("timing.disclaimer")}</p>
    </BottomSheet>
  );
}
