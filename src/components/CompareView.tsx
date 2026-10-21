"use client";
/**
 * "비교" tab: puts today's prices in context with EU Weekly Oil Bulletin data —
 * Germany vs. its own history, vs. neighbouring countries, and the tax share.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  BENCHMARK_FUEL_LABELS,
  NEIGHBOURS,
  VERDICT_LABELS,
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
import { formatCtDiff, formatEuro, formatIsoDate, formatLitrePrice, formatMonthDay } from "@/lib/format";
import { Segmented } from "./Segmented";
import { StatusMessage } from "./StatusMessage";
import { TrendChart } from "./TrendChart";

interface CompareViewProps {
  data: Benchmarks | null;
  fuel: BenchmarkFuel;
  onFuelChange: (fuel: BenchmarkFuel) => void;
  litres: number;
}

type Range = 1 | 3 | 10;

const VERDICT_STYLE = {
  low: "bg-low-soft text-low",
  mid: "bg-mid-soft text-mid",
  high: "bg-high-soft text-high",
} as const;

function Card({ title, sub, children, id }: { title: string; sub?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="mx-4 mt-4 rounded-[var(--radius-card)] bg-surface px-4 pt-4 pb-4">
      <h2 id={id} className="text-[17px] font-bold">
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[10px] bg-surface-2 px-3 py-2.5">
      <dt className="text-[12px] font-medium text-ink-2">{label}</dt>
      <dd className="tnum mt-0.5 text-[17px] font-bold">{value}</dd>
      {note && <dd className="tnum text-[12px] text-ink-3">{note}</dd>}
    </div>
  );
}

const ctPerLitre = (diff: number) => `리터당 ${formatCtDiff(diff).replace("+", "").replace("−", "")}`;

export function CompareView({ data, fuel, onFuelChange, litres }: CompareViewProps) {
  const [range, setRange] = useState<Range>(3);
  const [allCountries, setAllCountries] = useState(false);

  const series = useMemo(() => (data ? seriesOf(data, fuel) : []), [data, fuel]);
  const three = useMemo(() => windowStats(series, 3), [series]);
  const ranged = useMemo(() => windowStats(series, range), [series, range]);
  const rangePoints = useMemo(() => windowOf(series, range), [series, range]);
  const years = useMemo(() => yearlySummary(series), [series]);

  if (!data) {
    return <div className="skeleton mx-4 h-64" aria-label="비교 데이터 불러오는 중" />;
  }
  if (!three || !ranged) {
    return <StatusMessage title="비교 데이터가 없어요" description="잠시 후 다시 확인해 주세요." />;
  }

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
      ? `최근 3년 중 비싼 상위 ${Math.max(1, 100 - three.percentile)}%`
      : verdict === "low"
        ? `최근 3년 중 싼 하위 ${Math.max(1, three.percentile)}%`
        : `최근 3년 중 중간 수준 (${three.percentile}번째 백분위)`;

  return (
    <div className="pb-2">
      <div className="px-4">
        <Segmented<BenchmarkFuel>
          label="비교할 연료"
          value={fuel}
          onChange={onFuelChange}
          options={[
            { value: "euro95", label: "휘발유" },
            { value: "diesel", label: "디젤" },
          ]}
        />
      </div>

      {/* Headline: this week vs. the last three years */}
      <section aria-labelledby="cmp-now" className="mx-4 mt-4 rounded-[var(--radius-card)] bg-board px-4 pt-3.5 pb-4 text-board-ink ring-1 ring-board-line">
        <h2 id="cmp-now" className="text-[13px] text-board-ink-2">
          독일 전국 평균 · {BENCHMARK_FUEL_LABELS[fuel]} · {formatMonthDay(three.latest.date)} 주
        </h2>
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="num text-[48px] leading-[1.05] font-bold tracking-[-0.03em]">
            {Math.floor(three.latest.price)}
            <span className="price-comma">,</span>
            {three.latest.price.toFixed(3).split(".")[1]}
            <span className="ml-1.5 font-sans text-[18px] font-semibold tracking-normal text-board-ink-2">€/L</span>
          </span>
          <span className={`mb-2 shrink-0 rounded-md px-2 py-1 text-[14px] font-bold ${VERDICT_STYLE[verdict]}`}>
            {VERDICT_LABELS[verdict]}
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed">
          최근 3년 평균({formatLitrePrice(three.average)})보다{" "}
          <strong className="font-semibold">
            {ctPerLitre(diff3y)} {diff3y >= 0 ? "비싸요" : "싸요"}
          </strong>
          .
        </p>
        <p className="mt-0.5 text-[13px] text-board-ink-2">{percentileText}</p>
      </section>

      {/* What it means for one fill-up */}
      <Card id="cmp-fill" title={`${litres}L 한 번 주유하면`} sub="독일 전국 평균 가격 기준">
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="이번 주" value={formatEuro(three.latest.price * litres)} />
          <Stat
            label="1년 전"
            value={three.yearAgo ? formatEuro(three.yearAgo.price * litres) : "–"}
            note={yoy !== null ? `지금 ${yoy >= 0 ? "+" : "−"}${formatEuro(Math.abs(yoy * litres))}` : undefined}
          />
          <Stat
            label="3년 평균"
            value={formatEuro(three.average * litres)}
            note={`지금 ${diff3y >= 0 ? "+" : "−"}${formatEuro(Math.abs(diff3y * litres))}`}
          />
        </dl>
      </Card>

      {/* Trend */}
      <Card id="cmp-trend" title="가격 추이" sub="주간 전국 평균, 세금 포함">
        <Segmented<Range>
          label="기간"
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: 1, label: "1년" },
            { value: 3, label: "3년" },
            { value: 10, label: "10년" },
          ]}
        />
        <div className="mt-3 flex items-center gap-4 text-[12px] text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-accent" />
            주간 평균
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-[1.5px] border-dashed border-ink-2" />
            {range}년 평균 {formatLitrePrice(ranged.average)}
          </span>
        </div>
        <div className="mt-1 -mx-1">
          <TrendChart
            points={rangePoints}
            average={ranged.average}
            label={`최근 ${range}년 독일 ${BENCHMARK_FUEL_LABELS[fuel]} 주간 평균 가격 추이. 평균 ${formatLitrePrice(ranged.average)}, 최저 ${formatLitrePrice(ranged.min.price)}, 최고 ${formatLitrePrice(ranged.max.price)}, 이번 주 ${formatLitrePrice(ranged.latest.price)}`}
          />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label={`${range}년 평균`} value={formatLitrePrice(ranged.average)} />
          <Stat label="최저" value={formatLitrePrice(ranged.min.price)} note={formatIsoDate(ranged.min.date)} />
          <Stat label="최고" value={formatLitrePrice(ranged.max.price)} note={formatIsoDate(ranged.max.date)} />
        </dl>
        <details className="group mt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-semibold text-accent">
            연도별 평균 표로 보기
          </summary>
          <table className="tnum mt-1 w-full text-[14px]">
            <caption className="sr-only">연도별 독일 평균 가격 (€/L)</caption>
            <thead>
              <tr className="text-left text-[12px] text-ink-2">
                <th scope="col" className="py-1.5 font-medium">연도</th>
                <th scope="col" className="py-1.5 text-right font-medium">평균</th>
                <th scope="col" className="py-1.5 text-right font-medium">최저</th>
                <th scope="col" className="py-1.5 text-right font-medium">최고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {years.map((y) => (
                <tr key={y.year}>
                  <th scope="row" className="py-1.5 text-left font-medium">
                    {y.year}
                    {y.weeks < 50 && <span className="ml-1 text-[12px] font-normal text-ink-3">({y.weeks}주)</span>}
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
        title={allCountries ? "EU 27개국과 비교" : "이웃 나라와 비교"}
        sub={rank ? `독일은 EU ${rank.of}개국 중 ${rank.of - rank.rank + 1}번째로 비싸요 · ${formatMonthDay(data.latestDate)} 주` : undefined}
      >
        {cheapestNeighbour && !allCountries && (
          <p className="mb-3 rounded-[10px] bg-surface-2 px-3 py-2.5 text-[14px] leading-relaxed">
            국경을 넘으면 <strong className="font-semibold">{cheapestNeighbour.name}</strong>가 가장 싸요 — 리터당{" "}
            {formatCtDiff(-cheapestNeighbour.diffToGermany).replace("+", "")}, {litres}L에{" "}
            <strong className="font-semibold">{formatEuro(-cheapestNeighbour.diffToGermany * litres)}</strong> 덜 들어요.
          </p>
        )}
        <ul className="space-y-1.5" aria-label="국가별 평균 가격, 싼 순">
          {countries.map((c) => (
            <CountryRow key={c.code} c={c} max={maxPrice} germany={de.price} />
          ))}
        </ul>
        {allCountries && countries.some((c) => c.code === "MT") && (
          <p className="mt-2 text-[12px] text-ink-3">몰타는 정부가 연료 가격을 고정하고 있어요.</p>
        )}
        <button
          type="button"
          onClick={() => setAllCountries((v) => !v)}
          aria-expanded={allCountries}
          className="mt-2 flex min-h-11 items-center text-[14px] font-semibold text-accent"
        >
          {allCountries ? "이웃 나라만 보기" : "EU 전체 보기"}
        </button>
      </Card>

      {/* Taxes */}
      {tax && (
        <Card id="cmp-tax" title="1리터 가격 중 세금" sub={`독일 · ${formatMonthDay(data.germanyTax.date)} 주`}>
          <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-[8px]" aria-hidden="true">
            <div className="bg-ink" style={{ width: `${tax.share}%` }} />
            <div className="flex-1 bg-surface-3" />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[14px]">
            <div>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2.5 rounded-[3px] bg-ink" aria-hidden="true" />
                세금·부과금
              </dt>
              <dd className="tnum font-bold">
                {formatLitrePrice(tax.tax)} <span className="font-medium text-ink-2">({tax.share}%)</span>
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2.5 rounded-[3px] bg-surface-3 ring-1 ring-line" aria-hidden="true" />
                제품·유통·마진
              </dt>
              <dd className="tnum font-bold">
                {formatLitrePrice(tax.net)} <span className="font-medium text-ink-2">({100 - tax.share}%)</span>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            에너지세와 부가가치세(19%) 등이 포함돼요. 주유소끼리 다툴 수 있는 건 나머지 부분이라, 같은 날 주유소 간 차이는
            보통 몇 센트 수준이에요.
          </p>
        </Card>
      )}

      <p className="px-5 pt-5 text-[12px] leading-relaxed text-ink-3">
        출처: EU 집행위원회{" "}
        <a href={data.source.url} target="_blank" rel="noopener" className="underline underline-offset-2">
          Weekly Oil Bulletin
        </a>{" "}
        (© European Union, CC BY 4.0). 매주 월요일 기준 국가 평균 판매가예요. Super 95는 E5에 해당하고, E10은 보통 이보다
        조금 싸요. 주변 주유소 가격(MTS-K)과는 기준 시점과 방식이 달라요.
      </p>
    </div>
  );
}

function CountryRow({ c, max, germany }: { c: RankedCountry; max: number; germany: number }) {
  const width = `${Math.max(4, (c.price / max) * 100)}%`;
  const bar = c.isGermany ? "bg-accent" : c.isAggregate ? "bg-ink-3/45" : "bg-ink-3/70";
  return (
    <li className={`grid grid-cols-[84px_1fr_auto] items-center gap-2.5 ${c.isGermany ? "font-bold" : ""}`}>
      <span className={`truncate text-[14px] ${c.isAggregate ? "text-ink-2" : ""}`}>{c.name}</span>
      <span className="h-3 w-full" aria-hidden="true">
        <span className={`block h-full rounded-r-[4px] ${bar}`} style={{ width }} />
      </span>
      <span className="tnum min-w-[118px] text-right text-[14px]">
        {formatLitrePrice(c.price)}
        {!c.isGermany && (
          <span className={`ml-1.5 inline-block min-w-[52px] text-right text-[12px] font-medium ${c.price < germany ? "text-low" : "text-ink-2"}`}>
            {formatCtDiff(c.diffToGermany)}
          </span>
        )}
        {c.isGermany && <span className="ml-1.5 inline-block min-w-[52px] text-right text-[12px] font-medium text-ink-2">기준</span>}
      </span>
    </li>
  );
}
