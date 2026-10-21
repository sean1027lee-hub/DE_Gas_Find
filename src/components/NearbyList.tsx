"use client";
import { useState } from "react";
import type { RankResult, SortMode } from "@/lib/pricing";
import { updateSettings, type Radius } from "@/lib/store";
import { FUEL_LABELS, type Fuel, type Station } from "@/lib/types";
import { Button } from "./Button";
import { ChevronDownIcon, StarIcon } from "./icons";
import { Segmented } from "./Segmented";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { StationRow } from "./StationRow";
import { SummaryCard, SummarySkeleton } from "./SummaryCard";

interface NearbyListProps {
  result: RankResult | null;
  loading: boolean;
  fuel: Fuel;
  radiusKm: Radius;
  sort: SortMode;
  litres: number;
  stale: boolean;
  favoriteIds: Set<string>;
  onSelect: (station: Station) => void;
}

const NEXT_RADIUS: Record<Radius, Radius | null> = { 2: 5, 5: 10, 10: 25, 25: null };

export function NearbyList({ result, loading, fuel, radiusKm, sort, litres, stale, favoriteIds, onSelect }: NearbyListProps) {
  const [showClosed, setShowClosed] = useState(false);

  if (!result) {
    return (
      <div aria-busy="true" aria-label="가격 불러오는 중">
        <div className="px-4">
          <SummarySkeleton />
        </div>
        <ul className="mt-4">
          {Array.from({ length: 6 }, (_, i) => (
            <RowSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  const { open, closed, cheapest, average, withoutPrice } = result;
  const nextRadius = NEXT_RADIUS[radiusKm];

  if (open.length === 0) {
    const hasClosed = closed.length > 0;
    return (
      <>
        <StatusMessage
          title={
            hasClosed
              ? `지금 ${radiusKm} km 안에 영업 중인 주유소가 없어요`
              : `${radiusKm} km 안에 ${FUEL_LABELS[fuel]} 가격이 있는 주유소가 없어요`
          }
          description={
            nextRadius
              ? `반경을 ${nextRadius} km로 넓혀 보세요.`
              : "다른 위치를 선택하거나 잠시 후 다시 확인해 보세요."
          }
          actions={
            nextRadius && (
              <Button onClick={() => updateSettings({ radiusKm: nextRadius })}>{nextRadius} km로 넓히기</Button>
            )
          }
        />
        {hasClosed && (
          <ClosedSection
            items={closed}
            open={showClosed}
            onToggle={() => setShowClosed((v) => !v)}
            favoriteIds={favoriteIds}
            onSelect={onSelect}
          />
        )}
      </>
    );
  }

  const pinned = [...open, ...closed].filter((r) => favoriteIds.has(r.station.id));

  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {cheapest && (
        <div className="px-4">
          <SummaryCard
            cheapest={cheapest}
            average={average}
            count={open.length}
            fuel={fuel}
            radiusKm={radiusKm}
            litres={litres}
            stale={stale}
            onSelect={() => onSelect(cheapest.station)}
          />
        </div>
      )}

      {pinned.length > 0 && (
        <section aria-labelledby="pinned-heading" className="mt-5">
          <h2 id="pinned-heading" className="flex items-center gap-1.5 px-4 text-[14px] font-semibold text-ink-2">
            <StarIcon size={15} filled /> 즐겨찾기
          </h2>
          <ul className="mx-4 mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {pinned.map((item) => (
              <StationRow key={item.station.id} item={item} favorite onSelect={() => onSelect(item.station)} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="list-heading" className="mt-5">
        <div className="flex items-center justify-between gap-3 px-4">
          <h2 id="list-heading" className="text-[14px] font-semibold text-ink-2">
            영업 중 <span className="tnum">{open.length}</span>곳
          </h2>
          <Segmented<SortMode>
            label="정렬"
            size="sm"
            value={sort}
            onChange={(v) => updateSettings({ sort: v })}
            options={[
              { value: "price", label: "가격순" },
              { value: "distance", label: "거리순" },
            ]}
            className="w-[156px] text-[14px]"
          />
        </div>
        <ul className="mx-4 mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" aria-labelledby="list-heading">
          {open.map((item) => (
            <StationRow
              key={item.station.id}
              item={item}
              favorite={favoriteIds.has(item.station.id)}
              onSelect={() => onSelect(item.station)}
            />
          ))}
        </ul>
      </section>

      {closed.length > 0 && (
        <ClosedSection
          items={closed}
          open={showClosed}
          onToggle={() => setShowClosed((v) => !v)}
          favoriteIds={favoriteIds}
          onSelect={onSelect}
        />
      )}

      {withoutPrice > 0 && (
        <p className="mt-4 px-4 text-[13px] text-ink-3">
          {FUEL_LABELS[fuel]} 가격이 없는 주유소 {withoutPrice}곳은 목록에서 뺐어요.
        </p>
      )}
    </div>
  );
}

function ClosedSection({
  items,
  open,
  onToggle,
  favoriteIds,
  onSelect,
}: {
  items: RankResult["closed"];
  open: boolean;
  onToggle: () => void;
  favoriteIds: Set<string>;
  onSelect: (s: Station) => void;
}) {
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mx-4 flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-ink-2"
      >
        영업 종료 {items.length}곳 {open ? "접기" : "보기"}
        <ChevronDownIcon size={16} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <ul className="mx-4 mt-1 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
          {items.map((item) => (
            <StationRow
              key={item.station.id}
              item={item}
              favorite={favoriteIds.has(item.station.id)}
              onSelect={() => onSelect(item.station)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
