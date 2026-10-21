"use client";
import { useT } from "@/i18n";
import { formatCt, formatDistance, formatEuro } from "@/lib/format";
import { navUrl, type NavApp } from "@/lib/nav";
import { savingsFor, type RankedStation } from "@/lib/pricing";
import { FUEL_LABELS, type Fuel } from "@/lib/types";
import { ChevronRightIcon, NavigationIcon } from "./icons";
import { AnimatedPrice } from "./Price";
import { nameWithoutBrand, stationTitle } from "./station-text";

interface HeroCardProps {
  cheapest: RankedStation;
  average: number | null;
  count: number;
  fuel: Fuel;
  radiusKm: number;
  litres: number;
  stale: boolean;
  navApp: NavApp;
  onSelect: () => void;
}

/**
 * The answer to "where is it cheapest?", styled like a price sign. The top part
 * opens details; directions are one tap away in the footer.
 */
export function HeroCard({ cheapest, average, count, fuel, radiusKm, litres, stale, navApp, onSelect }: HeroCardProps) {
  const { t } = useT();
  const { station, price, distanceKm } = cheapest;
  const savings = average !== null ? savingsFor(price, average, litres) : 0;
  const perLitre = average !== null ? average - price : 0;
  const subtitle = station.brand ? nameWithoutBrand(station) : "";
  const name = `${stationTitle(station)} ${subtitle}`.trim();
  const app = t(navApp === "apple" ? "nav.apple" : "nav.google");

  return (
    <section
      aria-labelledby="hero-label"
      className={`overflow-hidden rounded-[var(--radius-card)] bg-board text-board-ink ring-1 ring-board-line transition-opacity ${stale ? "opacity-75" : ""}`}
    >
      <button type="button" onClick={onSelect} className="block w-full px-4 pt-3.5 pb-2 text-left active:opacity-90" aria-describedby="hero-saving">
        <span className="flex items-center justify-between gap-2 text-meta text-board-ink-2">
          <span id="hero-label">{t("hero.label", { fuel: FUEL_LABELS[fuel], radius: radiusKm })}</span>
          <ChevronRightIcon size={18} className="shrink-0" />
        </span>
        <span className="mt-0.5 flex flex-wrap items-end justify-between gap-x-3">
          <AnimatedPrice price={price} label={t("a11y.cheapestNearby")} className="text-display leading-[1.05] font-extrabold tracking-[-0.045em]" />
          <span className="tnum pb-2 text-ui font-medium">{formatDistance(distanceKm)}</span>
        </span>
        <span className="block truncate text-base">
          <strong className="font-semibold" lang="de">
            {stationTitle(station)}
          </strong>
          {subtitle && (
            <span className="ml-1.5 text-board-ink-2" lang="de">
              {subtitle}
            </span>
          )}
        </span>
        <span className="sr-only">{t("hero.details")}</span>
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-board-line px-4 py-2.5">
        <p id="hero-saving" className="min-w-[min(100%,12rem)] flex-1 text-sm leading-snug">
          {count <= 1
            ? t("hero.onlyOne")
            : savings <= 0
              ? t("hero.allSame")
              : t("hero.saving", { ct: formatCt(perLitre), litres, euro: formatEuro(savings) })}
        </p>
        <a
          href={navUrl(navApp, station, name)}
          target="_blank"
          rel="noopener"
          aria-label={t("hero.navigateAria", { name, app })}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-bold text-accent-ink active:opacity-85"
        >
          <NavigationIcon size={17} />
          {t("hero.navigate")}
        </a>
      </div>
    </section>
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
