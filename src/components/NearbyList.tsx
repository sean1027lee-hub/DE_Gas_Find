"use client";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n";
import type { RankResult, SortMode } from "@/lib/pricing";
import { updateSettings, type Radius } from "@/lib/store";
import { FUEL_LABELS, type Fuel, type Station } from "@/lib/types";
import { Button } from "./Button";
import { ChevronDownIcon, StarIcon } from "./icons";
import { Segmented } from "./Segmented";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { StationRow } from "./StationRow";
import { SummarySkeleton } from "./SummaryCard";

interface NearbyListProps {
  result: RankResult | null;
  loading: boolean;
  fuel: Fuel;
  radiusKm: Radius;
  sort: SortMode;
  favoriteIds: Set<string>;
  onSelect: (station: Station) => void;
  /** Hero card, timing and market context, rendered above the list. */
  top?: ReactNode;
}

const NEXT_RADIUS: Record<Radius, Radius | null> = { 2: 5, 5: 10, 10: 25, 25: null };

const LIST = "mx-4 mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface";

export function NearbyList({ result, loading, fuel, radiusKm, sort, favoriteIds, onSelect, top }: NearbyListProps) {
  const { t } = useT();
  const [showClosed, setShowClosed] = useState(false);

  if (!result) {
    return (
      <div aria-busy="true" aria-label={t("list.loading")}>
        <div className="px-4">
          <SummarySkeleton />
        </div>
        <ul className={`${LIST} mt-4`}>
          {Array.from({ length: 6 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  const { open, closed, withoutPrice } = result;
  const nextRadius = NEXT_RADIUS[radiusKm];
  const row = (item: RankResult["open"][number], favorite = favoriteIds.has(item.station.id)) => (
    <StationRow key={item.station.id} item={item} fuel={fuel} favorite={favorite} onSelect={() => onSelect(item.station)} />
  );
  const closedSection = closed.length > 0 && (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setShowClosed((v) => !v)}
        aria-expanded={showClosed}
        className="mx-4 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-2"
      >
        {t(showClosed ? "list.closedHide" : "list.closedShow", { n: closed.length })}
        <ChevronDownIcon size={16} className={showClosed ? "rotate-180" : ""} />
      </button>
      {showClosed && <ul className={`${LIST} mt-1`}>{closed.map((item) => row(item))}</ul>}
    </section>
  );

  if (open.length === 0) {
    return (
      <>
        <StatusMessage
          title={
            closed.length > 0
              ? t("empty.noneOpen", { radius: radiusKm })
              : t("empty.noPrice", { radius: radiusKm, fuel: FUEL_LABELS[fuel] })
          }
          description={nextRadius ? t("empty.widen", { next: nextRadius }) : t("empty.elsewhere")}
          actions={
            nextRadius && (
              <Button onClick={() => updateSettings({ radiusKm: nextRadius })}>{t("empty.widenBtn", { next: nextRadius })}</Button>
            )
          }
        />
        {closedSection}
      </>
    );
  }

  const pinned = [...open, ...closed].filter((r) => favoriteIds.has(r.station.id));

  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {top && <div className="px-4">{top}</div>}

      {pinned.length > 0 && (
        <section aria-labelledby="pinned-heading" className="mt-5">
          <h2 id="pinned-heading" className="flex items-center gap-1.5 px-4 text-sm font-semibold text-ink-2">
            <StarIcon size={15} filled /> {t("tab.favorites")}
          </h2>
          <ul className={LIST}>{pinned.map((item) => row(item, true))}</ul>
        </section>
      )}

      <section aria-labelledby="list-heading" className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <h2 id="list-heading" className="text-sm font-semibold text-ink-2">
            {t("list.openCount", { n: open.length })}
          </h2>
          <Segmented<SortMode>
            label={t("list.sort")}
            size="sm"
            value={sort}
            onChange={(v) => updateSettings({ sort: v })}
            options={[
              { value: "price", label: t("list.byPrice") },
              { value: "distance", label: t("list.byDistance") },
            ]}
            className="min-w-[10rem] text-sm"
          />
        </div>
        <ul className={LIST} aria-labelledby="list-heading">
          {open.map((item) => row(item))}
        </ul>
      </section>

      {closedSection}

      {withoutPrice > 0 && (
        <p className="mt-4 px-4 text-meta text-ink-3">{t("list.withoutPrice", { fuel: FUEL_LABELS[fuel], n: withoutPrice })}</p>
      )}
    </div>
  );
}
