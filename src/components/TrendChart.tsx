"use client";
/**
 * Weekly national price line. Single series (no legend; the heading names it),
 * dashed reference line for the period average, crosshair + tooltip on hover,
 * arrow keys on focus. Values stay reachable without hover via the stats and the
 * yearly table next to the chart.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Point } from "@/lib/benchmarks";
import { formatIsoDate, formatLitrePrice } from "@/lib/format";

interface TrendChartProps {
  points: Point[];
  average: number;
  label: string;
}

const HEIGHT = 208;
const M = { top: 14, right: 14, bottom: 26, left: 44 };

function niceStep(range: number): number {
  const raw = range / 4;
  const steps = [0.05, 0.1, 0.2, 0.25, 0.5, 1];
  return steps.find((s) => s >= raw) ?? 1;
}

export function TrendChart({ points, average, label }: TrendChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const prices = points.map((p) => p.price);
    const lo = Math.min(...prices, average);
    const hi = Math.max(...prices, average);
    const step = niceStep(hi - lo || 0.1);
    const yMin = Math.floor(lo / step) * step;
    const yMax = Math.ceil(hi / step) * step;
    const innerW = width - M.left - M.right;
    const innerH = HEIGHT - M.top - M.bottom;
    const t0 = new Date(points[0].date).getTime();
    const t1 = new Date(points[points.length - 1].date).getTime();
    const x = (iso: string) => M.left + ((new Date(iso).getTime() - t0) / Math.max(1, t1 - t0)) * innerW;
    const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
    const yTicks: number[] = [];
    for (let v = yMin; v <= yMax + 1e-9; v += step) yTicks.push(Math.round(v * 1000) / 1000);

    // X ticks: years for long ranges, quarters for ~1 year.
    const spanYears = (t1 - t0) / (365.25 * 86_400_000);
    const xTicks: { x: number; label: string }[] = [];
    const startYear = new Date(points[0].date).getUTCFullYear();
    const endYear = new Date(points[points.length - 1].date).getUTCFullYear();
    if (spanYears > 1.5) {
      const every = spanYears > 6 ? 2 : 1;
      for (let yr = startYear + 1; yr <= endYear; yr++) {
        if ((endYear - yr) % every) continue;
        xTicks.push({ x: x(`${yr}-01-01`), label: String(yr) });
      }
    } else {
      for (let yr = startYear; yr <= endYear; yr++) {
        for (const m of [1, 4, 7, 10]) {
          const iso = `${yr}-${String(m).padStart(2, "0")}-01`;
          const t = new Date(iso).getTime();
          if (t <= t0 || t >= t1) continue;
          xTicks.push({ x: x(iso), label: m === 1 ? `${yr}` : `${m}월` });
        }
      }
    }
    return { x, y, path, yTicks, xTicks, innerW };
  }, [points, average, width]);

  const indexAt = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(geo.x(p.date) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const last = points[points.length - 1];
  const activePoint = active !== null ? points[active] : null;
  const tipLeft = activePoint ? Math.min(Math.max(geo.x(activePoint.date), 70), width - 70) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-lg"
      tabIndex={0}
      role="group"
      aria-label={`${label}. 좌우 방향키로 주별 가격을 확인할 수 있어요.`}
      onPointerMove={(e) => setActive(indexAt(e.clientX))}
      onPointerDown={(e) => setActive(indexAt(e.clientX))}
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
        e.preventDefault();
        setActive((i) => {
          const cur = i ?? points.length - 1;
          if (e.key === "Home") return 0;
          if (e.key === "End") return points.length - 1;
          const step = e.shiftKey ? 4 : 1;
          return Math.min(points.length - 1, Math.max(0, cur + (e.key === "ArrowRight" ? step : -step)));
        });
      }}
    >
      <svg width={width} height={HEIGHT} aria-hidden="true" className="block overflow-visible">
        {geo.yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={width - M.right} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={M.left - 8} y={geo.y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)" className="tnum">
              {v.toFixed(2).replace(".", ",")}
            </text>
          </g>
        ))}
        {geo.xTicks.map((t) => (
          <text key={t.label + t.x} x={t.x} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fill="var(--ink-3)" className="tnum">
            {t.label}
          </text>
        ))}
        <line
          x1={M.left}
          x2={width - M.right}
          y1={geo.y(average)}
          y2={geo.y(average)}
          stroke="var(--ink-2)"
          strokeWidth={1.25}
          strokeDasharray="4 4"
        />
        <path d={geo.path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={geo.x(last.date)} cy={geo.y(last.price)} r={4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        {activePoint && (
          <>
            <line
              x1={geo.x(activePoint.date)}
              x2={geo.x(activePoint.date)}
              y1={M.top}
              y2={HEIGHT - M.bottom}
              stroke="var(--ink-3)"
              strokeWidth={1}
            />
            <circle
              cx={geo.x(activePoint.date)}
              cy={geo.y(activePoint.price)}
              r={5}
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {activePoint && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[8px] bg-surface px-2.5 py-1.5 text-center shadow-[0_2px_10px_rgb(0_0_0/0.18)] ring-1 ring-line"
          style={{ left: tipLeft }}
        >
          <div className="tnum text-[15px] font-bold">{formatLitrePrice(activePoint.price)}</div>
          <div className="tnum text-[12px] text-ink-2">{formatIsoDate(activePoint.date)} 주</div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {activePoint ? `${formatIsoDate(activePoint.date)} 주, 리터당 ${formatLitrePrice(activePoint.price)}` : ""}
      </p>
    </div>
  );
}
