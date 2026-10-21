"use client";
import { useT } from "@/i18n";
import { RADII, updateSettings, type Radius, type ViewMode } from "@/lib/store";
import { FUEL_LABELS, FUELS, FUEL_SHORT_LABELS, type Fuel } from "@/lib/types";
import { ListIcon, MapIcon } from "./icons";
import { Segmented } from "./Segmented";

interface ControlDockProps {
  fuel: Fuel;
  radiusKm: Radius;
  view: ViewMode;
  /** Desktop shows list and map side by side, so the view toggle is hidden. */
  showViewToggle?: boolean;
}

/** Bottom = controls, in thumb reach. */
export function ControlDock({ fuel, radiusKm, view, showViewToggle = true }: ControlDockProps) {
  const { t } = useT();
  return (
    <section aria-label={t("dock.region")} className="space-y-2 px-3 pt-2.5 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={t("dock.fuel")}
          value={fuel}
          onChange={(v) => updateSettings({ fuel: v })}
          options={FUELS.map((f) => ({
            value: f,
            label: <span lang="de">{FUEL_SHORT_LABELS[f]}</span>,
            ariaLabel: FUEL_LABELS[f],
          }))}
          className="min-w-[min(100%,14rem)] flex-1"
        />
        {showViewToggle && (
          <Segmented
            label={t("dock.view")}
            value={view}
            onChange={(v) => updateSettings({ view: v })}
            options={[
              { value: "list", label: <ListIcon size={20} />, ariaLabel: t("dock.list") },
              { value: "map", label: <MapIcon size={20} />, ariaLabel: t("dock.map") },
            ]}
            className="w-[6.5rem]"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 pl-1 text-meta font-medium text-ink-2" aria-hidden="true">
          {t("dock.radius")}
        </span>
        <Segmented<Radius>
          label={t("dock.radiusLabel")}
          variant="chips"
          size="sm"
          value={radiusKm}
          onChange={(v) => updateSettings({ radiusKm: v })}
          options={RADII.map((r) => ({ value: r, label: `${r} km` }))}
          className="scrollbar-none overflow-x-auto"
        />
      </div>
    </section>
  );
}
