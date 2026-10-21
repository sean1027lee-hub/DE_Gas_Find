"use client";
import { RADII, updateSettings, type Radius, type ViewMode } from "@/lib/store";
import { FUEL_LABELS, FUELS, FUEL_SHORT_LABELS, type Fuel } from "@/lib/types";
import { ListIcon, MapIcon } from "./icons";
import { Segmented } from "./Segmented";

interface ControlDockProps {
  fuel: Fuel;
  radiusKm: Radius;
  view: ViewMode;
}

/** Bottom = controls, in thumb reach. */
export function ControlDock({ fuel, radiusKm, view }: ControlDockProps) {
  return (
    <div className="space-y-2 px-3 pt-2.5 pb-2">
      <div className="flex items-center gap-2">
        <Segmented
          label="연료"
          value={fuel}
          onChange={(v) => updateSettings({ fuel: v })}
          options={FUELS.map((f) => ({
            value: f,
            label: <span lang="de">{FUEL_SHORT_LABELS[f]}</span>,
            ariaLabel: FUEL_LABELS[f],
          }))}
          className="flex-1"
        />
        <Segmented
          label="보기 방식"
          value={view}
          onChange={(v) => updateSettings({ view: v })}
          options={[
            { value: "list", label: <ListIcon size={20} />, ariaLabel: "목록" },
            { value: "map", label: <MapIcon size={20} />, ariaLabel: "지도" },
          ]}
          className="w-[104px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 pl-1 text-[13px] font-medium text-ink-2">
          반경
        </span>
        <Segmented<Radius>
          label="검색 반경"
          variant="chips"
          size="sm"
          value={radiusKm}
          onChange={(v) => updateSettings({ radiusKm: v })}
          options={RADII.map((r) => ({ value: r, label: `${r} km` }))}
          className="scrollbar-none overflow-x-auto"
        />
      </div>
    </div>
  );
}
