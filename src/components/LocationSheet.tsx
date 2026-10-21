"use client";
import type { LocError } from "@/hooks/useNearby";
import type { Place } from "@/lib/store";
import { BottomSheet } from "./BottomSheet";
import { HomeIcon, LocateIcon } from "./icons";
import { DeniedHelp, LOC_ERROR_TEXT } from "./LocationHelp";
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
        <span className="block truncate text-[13px] text-ink-2">{description}</span>
      </span>
    </button>
  );
}

export function LocationSheet({ open, onClose, home, locating, locError, onLocate, onHome, onPlace }: LocationSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="어디 기준으로 볼까요?">
      <div className="space-y-2">
        <OptionButton
          icon={<LocateIcon size={20} className={locating ? "animate-spin-slow" : ""} />}
          title={locating ? "위치 찾는 중…" : "현재 위치"}
          description="지금 있는 곳 주변 주유소"
          busy={locating}
          onClick={async () => {
            if (await onLocate()) onClose();
          }}
        />
        {locError && (
          <div className="rounded-[12px] bg-warn-soft px-4 py-3 text-warn-ink" role="alert">
            <p className="text-[14px] font-semibold">{LOC_ERROR_TEXT[locError]}</p>
            {locError === "denied" ? (
              <div className="mt-1 [&_p]:text-warn-ink [&_strong]:text-warn-ink">
                <DeniedHelp />
              </div>
            ) : (
              <p className="mt-1 text-[13px]">집 위치나 우편번호로도 볼 수 있어요.</p>
            )}
          </div>
        )}
        <OptionButton
          icon={<HomeIcon size={20} />}
          title="집"
          description={home.label}
          onClick={() => {
            onHome();
            onClose();
          }}
        />
      </div>
      <h3 className="mt-6 mb-2 text-[14px] font-semibold text-ink-2">다른 곳 찾기</h3>
      <PlaceSearch
        onPick={(p) => {
          onPlace(p);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
