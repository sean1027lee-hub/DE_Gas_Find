"use client";
/**
 * "비교" tab: puts today's prices in context with EU Weekly Oil Bulletin data —
 * Germany vs. its own history, vs. neighbouring countries, and the tax share.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useT, type MessageKey } from "@/i18n";
import {
  NEIGHBOURS,
  germanyRank,
  rankCountries,
  seriesOf,
  taxShare,
  verdictFor,
  windowOf,
  windowStats,
  yearlySummary,
  type BenchmarkFuel,
  type Benchmarks,
  type RankedCountry,
} from "@/lib/benchmarks";
import { formatCt, formatCtDiff, formatEuro, formatLitrePrice, formatMonthDay } from "@/lib/format";
import { Segmented } from "./Segmented";
import { StatusMessage } from "./StatusMessage";
import { TierBadge } from "./Tier";
import { TrendChart } from "./TrendChart";

interface CompareViewProps {
  data: Benchmarks | null;
  fuel: BenchmarkFuel;
  onFuelChange: (fuel: BenchmarkFuel) => void;
  litres: number;
}

type Range = 1 | 3 | 10;

function Card({ title, sub, children, id }: { title: string; sub?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="mt-4 rounded-[var(--radius-card)] bg-surface px-4 pt-4 pb-4">
      <h2 id={id} className="text-title font-bold">
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-meta text-ink-2">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
      <dt className="text-xs font-medium text-ink-2">{label}</dt>
      <dd className="tnum mt-0.5 text-title font-bold">{value}</dd>
      {note && <dd className="tnum text-xs text-ink-3">{note}</dd>}
    </div>
  );
}

const signedEuro = (v: number) => `${v >= 0 ? "+" : "−"}${formatEuro(Math.abs(v))}`;

export function CompareView({ data, fuel, onFuelChange, litres }: CompareViewProps) {
  const { t, lang } = useT();
  const [range, setRange] = useState<Range>(3);
  const [allCountries, setAllCountries] = useState(false);
  const country = (code: string) => t(`country.${code}` as MessageKey);
  const day = (iso: string) => formatMonthDay(iso, lang);

  const series = useMemo(() => (data ? seriesOf(data, fuel) : []), [data, fuel]);
  const three = useMemo(() => windowStats(series, 3), [series]);
  const ranged = useMemo(() => windowStats(series, range), [series, range]);
  const rangePoints = useMemo(() => windowOf(series, range), [series, range]);
  const years = useMemo(() => yearlySummary(series), [series]);

  if (!data) return <div className="skeleton mx-4 h-64" aria-label={t("cmp.loading")} />;
  if (!three || !ranged) return <StatusMessage title={t("cmp.noData")} description={t("error.later")} />;

  const fuelName = t(fuel === "diesel" ? "fuelGroup.diesel" : "fuelGroup.petrolLong");
  const verdict = verdictFor(three.percentile);
  const diff3y = three.latest.price - three.average;
  const yoy = three.yearAgo ? three.latest.price - three.yearAgo.price : null;
  const neighbours = rankCountries(data, fuel, NEIGHBOURS);
  const everyone = rankCountries(data, fuel);
  const rank = germanyRank(data, fuel);
  const tax = taxShare(data, fuel);
  const cheapestNeighbour = neighbours.find((c) => !c.isGermany && !c.isAggregate && c.diffToGermany < 0);
  const de = everyone.find((c) => c.isGermany)!;
  const countries = allCountries ? everyone : neighbours;
  const maxPrice = Math.max(...countries.map((c) => c.price));
  const percentileText =
    verdict === "high"
      ? t("cmp.pctHigh", { n: Math.max(1, 100 - three.percentile) })
      : verdict === "low"
        ? t("cmp.pctLow", { n: Math.max(1, three.percentile) })
        : t("cmp.pctMid", { n: three.percentile });
  const [euros, decimals] = three.latest.price.toFixed(3).split(".");

  return (
    <div className="px-4 pb-2 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:[&>*]:min-w-0">
      <div className="lg:col-span-2">
        <Segmented<BenchmarkFuel>
          label={t("cmp.fuelLabel")}
          value={fuel}
          onChange={onFuelChange}
          options={[
            { value: "euro95", label: t("cmp.segPetrol") },
            { value: "diesel", label: t("cmp.segDiesel") },
          ]}
        />
      </div>

      {/* Headline: this week vs. the last three years */}
      <section
        aria-labelledby="cmp-now"
        className="mt-4 rounded-[var(--radius-card)] bg-board px-4 pt-3.5 pb-4 text-board-ink ring-1 ring-board-line lg:col-span-2"
      >
        <h2 id="cmp-now" className="text-meta text-board-ink-2">
          {t("cmp.nowLabel", { fuel: fuelName, date: day(three.latest.date) })}
        </h2>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <span className="num text-display-md leading-[1.05] font-extrabold tracking-[-0.04em]">
            {euros}
            <span className="price-comma">,</span>
            {decimals}
            <span className="ml-1.5 font-sans text-lg font-semibold tracking-normal text-board-ink-2">€/L</span>
          </span>
          <TierBadge tier={verdict} className="mb-2 px-2 py-1 text-sm">
            {t(`verdict.${verdict}`)}
          </TierBadge>
        </div>
        <p className="mt-2 text-ui leading-relaxed">
          <strong className="font-semibold">
            {t(diff3y >= 0 ? "cmp.higher" : "cmp.lower", { avg: formatLitrePrice(three.average), ct: formatCt(Math.abs(diff3y)) })}
          </strong>
        </p>
        <p className="mt-0.5 text-meta text-board-ink-2">{percentileText}</p>
      </section>

      {/* What it means for one fill-up */}
      <Card id="cmp-fill" title={t("cmp.fillTitle", { litres })} sub={t("cmp.fillSub")}>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
          <Stat label={t("cmp.thisWeek")} value={formatEuro(three.latest.price * litres)} />
          <Stat
            label={t("cmp.yearAgo")}
            value={three.yearAgo ? formatEuro(three.yearAgo.price * litres) : "–"}
            note={yoy !== null ? t("cmp.nowDiff", { diff: signedEuro(yoy * litres) }) : undefined}
          />
          <Stat
            label={t("cmp.avg3y")}
            value={formatEuro(three.average * litres)}
            note={t("cmp.nowDiff", { diff: signedEuro(diff3y * litres) })}
          />
        </dl>
      </Card>

      {/* Trend */}
      <Card id="cmp-trend" title={t("cmp.trendTitle")} sub={t("cmp.trendSub")}>
        <Segmented<Range>
          label={t("cmp.range")}
          size="sm"
          value={range}
          onChange={setRange}
          options={([1, 3, 10] as Range[]).map((n) => ({ value: n, label: t("cmp.years", { n }) }))}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-accent" />
            {t("cmp.legendWeekly")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-[1.5px] border-dashed border-ink-2" />
            {t("cmp.legendAvg", { n: range, price: formatLitrePrice(ranged.average) })}
          </span>
        </div>
        <div className="-mx-1 mt-1">
          <TrendChart
            points={rangePoints}
            average={ranged.average}
            label={t("cmp.chartAria", {
              n: range,
              fuel: fuelName,
              avg: formatLitrePrice(ranged.average),
              min: formatLitrePrice(ranged.min.price),
              max: formatLitrePrice(ranged.max.price),
              now: formatLitrePrice(ranged.latest.price),
            })}
          />
        </div>
        <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
          <Stat label={t("cmp.statAvg", { n: range })} value={formatLitrePrice(ranged.average)} />
          <Stat label={t("cmp.min")} value={formatLitrePrice(ranged.min.price)} note={ranged.min.date.replaceAll("-", ".")} />
          <Stat label={t("cmp.max")} value={formatLitrePrice(ranged.max.price)} note={ranged.max.date.replaceAll("-", ".")} />
        </dl>
        <details className="group mt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-accent">{t("cmp.yearTable")}</summary>
          <table className="tnum mt-1 w-full text-sm">
            <caption className="sr-only">{t("cmp.yearCaption")}</caption>
            <thead>
              <tr className="text-left text-xs text-ink-2">
                <th scope="col" className="py-1.5 font-medium">{t("cmp.colYear")}</th>
                <th scope="col" className="py-1.5 text-right font-medium">{t("cmp.colAvg")}</th>
                <th scope="col" className="py-1.5 text-right font-medium">{t("cmp.min")}</th>
                <th scope="col" className="py-1.5 text-right font-medium">{t("cmp.max")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {years.map((y) => (
                <tr key={y.year}>
                  <th scope="row" className="py-1.5 text-left font-medium">
                    {y.year}
                    {y.weeks < 50 && <span className="ml-1 text-xs font-normal text-ink-3">{t("cmp.weeks", { n: y.weeks })}</span>}
                  </th>
                  <td className="py-1.5 text-right">{formatLitrePrice(y.average)}</td>
                  <td className="py-1.5 text-right text-ink-2">{formatLitrePrice(y.min)}</td>
                  <td className="py-1.5 text-right text-ink-2">{formatLitrePrice(y.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      {/* Countries */}
      <Card
        id="cmp-countries"
        title={t(allCountries ? "cmp.eu" : "cmp.neighbours")}
        sub={rank ? t("cmp.rank", { of: rank.of, n: rank.of - rank.rank + 1, date: day(data.latestDate) }) : undefined}
      >
        {cheapestNeighbour && !allCountries && (
          <p className="mb-3 rounded-[10px] bg-surface-2 px-3 py-2.5 text-sm leading-relaxed">
            {t("cmp.border", {
              country: country(cheapestNeighbour.code),
              ct: formatCt(-cheapestNeighbour.diffToGermany),
              litres,
              euro: formatEuro(-cheapestNeighbour.diffToGermany * litres),
            })}
          </p>
        )}
        <ul className="space-y-1.5" aria-label={t("cmp.countriesAria")}>
          {countries.map((c) => (
            <CountryRow key={c.code} c={c} name={country(c.code)} max={maxPrice} germany={de.price} baseline={t("cmp.baseline")} />
          ))}
        </ul>
        {allCountries && countries.some((c) => c.code === "MT") && <p className="mt-2 text-xs text-ink-3">{t("cmp.malta")}</p>}
        <button
          type="button"
          onClick={() => setAllCountries((v) => !v)}
          aria-expanded={allCountries}
          className="mt-2 flex min-h-11 items-center text-sm font-semibold text-accent"
        >
          {t(allCountries ? "cmp.showNeighbours" : "cmp.showEu")}
        </button>
      </Card>

      {/* Taxes */}
      {tax && (
        <Card id="cmp-tax" title={t("cmp.taxTitle")} sub={t("cmp.taxSub", { date: day(data.germanyTax.date) })}>
          <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-[8px]" aria-hidden="true">
            <div className="bg-ink" style={{ width: `${tax.share}%` }} />
            <div className="flex-1 bg-surface-3" />
          </div>
          <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2.5 rounded-[3px] bg-ink" aria-hidden="true" />
                {t("cmp.tax")}
              </dt>
              <dd className="tnum font-bold">
                {formatLitrePrice(tax.tax)} <span className="font-medium text-ink-2">({tax.share}%)</span>
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2.5 rounded-[3px] bg-surface-3 ring-1 ring-line" aria-hidden="true" />
                {t("cmp.net")}
              </dt>
              <dd className="tnum font-bold">
                {formatLitrePrice(tax.net)} <span className="font-medium text-ink-2">({100 - tax.share}%)</span>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-meta leading-relaxed text-ink-2">{t("cmp.taxNote")}</p>
        </Card>
      )}

      <p className="pt-5 text-xs leading-relaxed text-ink-3 lg:col-span-2">
        {t("cmp.sourcePrefix")}{" "}
        <a href={data.source.url} target="_blank" rel="noopener" className="underline underline-offset-2">
          Weekly Oil Bulletin
        </a>{" "}
        {t("cmp.sourceSuffix")}
      </p>
    </div>
  );
}

function CountryRow({ c, name, max, germany, baseline }: { c: RankedCountry; name: string; max: number; germany: number; baseline: string }) {
  const width = `${Math.max(4, (c.price / max) * 100)}%`;
  const bar = c.isGermany ? "bg-accent" : c.isAggregate ? "bg-ink-3/45" : "bg-ink-3/70";
  return (
    <li className={`grid grid-cols-[minmax(5rem,auto)_1fr_auto] items-center gap-2.5 ${c.isGermany ? "font-bold" : ""}`}>
      <span className={`truncate text-sm ${c.isAggregate ? "text-ink-2" : ""}`}>{name}</span>
      <span className="h-3 w-full min-w-8" aria-hidden="true">
        <span className={`block h-full rounded-r-[4px] ${bar}`} style={{ width }} />
      </span>
      <span className="tnum text-right text-sm whitespace-nowrap">
        {formatLitrePrice(c.price)}
        <span
          className={`ml-1.5 inline-block min-w-[3.25rem] text-right text-xs font-medium ${!c.isGermany && c.price < germany ? "text-low" : "text-ink-2"}`}
        >
          {c.isGermany ? baseline : formatCtDiff(c.diffToGermany)}
        </span>
      </span>
    </li>
  );
}
