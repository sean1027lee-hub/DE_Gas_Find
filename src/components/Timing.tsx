"use client";
/**
 * "지금 넣을까?" — when to fill up, Apple-Weather style: one sentence first,
 * then an hourly forecast. Based on the 12:00 rule and, once enough data exists,
 * on prices this device has seen in the area (see lib/timing.ts).
 */
import { useT } from "@/i18n";
import { formatCt, formatEuro, priceString } from "@/lib/format";
import { advise, forecast, type Curve, type HourPoint } from "@/lib/timing";
import { BottomSheet } from "./BottomSheet";
import { ChevronRightIcon, ClockIcon } from "./icons";
import { Price } from "./Price";
import { TierIcon } from "./Tier";

export interface TimingModel {
  nowPrice: number;
  nowHour: number;
  curve: Curve;
  learnedDays: number | null;
}

const PHASE_BADGE = {
  beforeNoon: "low",
  evening: "low",
  afterRaise: "high",
  night: "mid",
} as const;

function useAdvice(m: TimingModel) {
  const { t } = useT();
  const a = advise(m.nowPrice, m.nowHour, m.curve);
  const title = t(`timing.${a.phase}.title`);
  const sub = t(`timing.${a.phase}.sub`);
  const hourLabel = (h: number) => t("timing.hour", { h });
  const bestIsTomorrow = a.best.inHours > 0 && Math.floor(m.nowHour) + a.best.inHours >= 24;
  const bestWhen = bestIsTomorrow ? t("timing.tomorrow", { when: hourLabel(a.best.hour) }) : hourLabel(a.best.hour);
  const extra =
    a.waitSavingCt >= 1
      ? t("timing.waitSave", { when: bestWhen, ct: formatCt(a.waitSavingCt / 100) })
      : a.phase === "beforeNoon" && a.noonJumpCt && a.noonJumpCt > 1
        ? t("timing.noonJump", { ct: formatCt(a.noonJumpCt / 100) })
        : null;
  return { a, title, sub, extra, hourLabel, bestWhen };
}

export function TimingCard({ model, onOpen }: { model: TimingModel; onOpen: () => void }) {
  const { t } = useT();
  const { a, title, sub, extra } = useAdvice(model);
  const tier = PHASE_BADGE[a.phase];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left active:bg-surface-2"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${tier === "low" ? "bg-low-soft text-low" : tier === "high" ? "bg-high-soft text-high" : "bg-mid-soft text-mid"}`}
        aria-hidden="true"
      >
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

function tierOf(p: number, lo: number, hi: number) {
  if (hi - lo < 0.002) return "mid" as const;
  const r = (p - lo) / (hi - lo);
  return r <= 1 / 3 ? ("low" as const) : r >= 2 / 3 ? ("high" as const) : ("mid" as const);
}

const BAR: Record<"low" | "mid" | "high", string> = {
  low: "bg-low-solid",
  mid: "bg-mid-solid ring-1 ring-inset ring-mid",
  high: "bg-high-solid",
};
const ICON_TEXT: Record<"low" | "mid" | "high", string> = { low: "text-low", mid: "text-mid", high: "text-high" };

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
  const { a, title, sub, extra, hourLabel, bestWhen } = useAdvice(model);
  const points: HourPoint[] = forecast(model.nowPrice, model.nowHour, model.curve, 24);
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = Math.max(0.01, hi - lo);
  const diffEuro = (model.nowPrice - a.best.price) * litres;

  return (
    <BottomSheet open onClose={onClose} title={t("timing.title")}>
      <p className="text-h2 leading-snug font-extrabold tracking-tight">{title}</p>
      <p className="mt-1 text-ui text-ink-2">{extra ?? sub}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-meta text-ink-2">
        <span>{t("timing.forecastLabel")}</span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">
          {fuelLabel} ·{" "}
          {model.learnedDays ? t("timing.basisLearned", { days: model.learnedDays }) : t("timing.basisTypical")}
        </span>
      </p>

      <ol
        className="scrollbar-none -mx-5 mt-3 flex snap-x gap-1.5 overflow-x-auto px-5 pb-1"
        aria-label={t("timing.chartAria")}
        tabIndex={0}
      >
        {points.map((p) => {
          const tier = tierOf(p.price, lo, hi);
          const height = 22 + ((p.price - lo) / span) * 78;
          const label = p.inHours === 0 ? t("timing.now") : hourLabel(p.hour);
          return (
            <li key={p.inHours} className="flex w-12 shrink-0 snap-start flex-col items-center gap-1">
              <span className="sr-only">{t("timing.hourSr", { hour: label, price: priceString(p.price) })}</span>
              <span className="tnum text-2xs font-bold" aria-hidden="true">
                {priceString(p.price)}
              </span>
              <span className="flex h-24 w-full items-end justify-center" aria-hidden="true">
                <span
                  className={`w-7 rounded-t-[6px] rounded-b-[2px] ${BAR[tier]} ${p.inHours === 0 ? "outline-2 outline-offset-2 outline-accent" : ""}`}
                  style={{ height: `${height}%` }}
                />
              </span>
              <TierIcon tier={tier} size={10} className={ICON_TEXT[tier]} />
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

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
          <dt className="text-xs font-medium text-ink-2">{t("timing.factBest")}</dt>
          <dd className="mt-0.5 text-title font-bold">
            {a.best.inHours === 0 ? t("timing.now") : bestWhen} ·{" "}
            <Price price={a.best.price} className="font-extrabold" />
          </dd>
        </div>
        <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
          <dt className="text-xs font-medium text-ink-2">{t("timing.factLitres", { litres })}</dt>
          <dd className="tnum mt-0.5 text-title font-bold">{formatEuro(Math.max(0, diffEuro))}</dd>
        </div>
      </dl>

      <h3 className="mt-5 text-ui font-bold">{t("timing.why")}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("timing.whyRule")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {model.learnedDays ? t("timing.whyLearned", { days: model.learnedDays }) : t("timing.whyTypical")}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">{t("timing.disclaimer")}</p>
    </BottomSheet>
  );
}
