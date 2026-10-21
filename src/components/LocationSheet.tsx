"use client";
import { useT } from "@/i18n";
import type { LocError } from "@/hooks/useNearby";
import type { Place } from "@/lib/store";
import { BottomSheet } from "./BottomSheet";
import { HomeIcon, LocateIcon } from "./icons";
import { DeniedHelp, LOC_ERROR_KEY } from "./LocationHelp";
import { PlaceSearch } from "./PlaceSearch";

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
  home: Place;
  locating: boolean;
  locError: LocError | null;
  onLocate: () => Promise<boolean>;
  onHome: () => void;
  onPlace: (place: Place) => void;
}

function OptionButton({
  icon,
  title,
  description,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-16 w-full items-center gap-3.5 rounded-[12px] bg-surface-2 px-4 py-3 text-left active:bg-surface-3 disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-meta text-ink-2" lang="de">
          {description}
        </span>
      </span>
    </button>
  );
}

export function LocationSheet({ open, onClose, home, locating, locError, onLocate, onHome, onPlace }: LocationSheetProps) {
  const { t } = useT();
  return (
    <BottomSheet open={open} onClose={onClose} title={t("locsheet.title")}>
      <div className="space-y-2">
        <OptionButton
          icon={<LocateIcon size={20} className={locating ? "animate-spin-slow" : ""} />}
          title={locating ? t("header.locating") : t("loc.current")}
          description={t("locsheet.currentDesc")}
          busy={locating}
          onClick={async () => {
            if (await onLocate()) onClose();
          }}
        />
        {locError && (
          <div className="rounded-[12px] bg-warn-soft px-4 py-3 text-warn-ink" role="alert">
            <p className="text-sm font-semibold">{t(LOC_ERROR_KEY[locError])}</p>
            {locError === "denied" ? <DeniedHelp /> : <p className="mt-1 text-meta">{t("locsheet.fallbackHint")}</p>}
          </div>
        )}
        <OptionButton
          icon={<HomeIcon size={20} />}
          title={t("locsheet.home")}
          description={home.label}
          onClick={() => {
            onHome();
            onClose();
          }}
        />
      </div>
      <h3 className="mt-6 mb-2 text-sm font-semibold text-ink-2">{t("locsheet.other")}</h3>
      <PlaceSearch
        onPick={(p) => {
          onPlace(p);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
