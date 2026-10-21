"use client";
import { useState } from "react";
import type { LocError } from "@/hooks/useNearby";
import { updateSettings, type Place, type Settings } from "@/lib/store";
import { FUEL_LABELS, FUELS, type Fuel } from "@/lib/types";
import { Button } from "./Button";
import { HomeIcon, LocateIcon, SearchIcon } from "./icons";
import { DeniedHelp, LOC_ERROR_TEXT } from "./LocationHelp";
import { LogoMark } from "./Logo";
import { PlaceSearch } from "./PlaceSearch";
import { Price } from "./Price";

interface OnboardingProps {
  settings: Settings;
  locating: boolean;
  locError: LocError | null;
  onLocate: () => Promise<boolean>;
  onHome: () => void;
  onPlace: (place: Place) => void;
}

const FUEL_HINTS: Record<Fuel, string> = {
  e10: "대부분의 휘발유 차",
  e5: "E10을 못 넣는 차",
  diesel: "디젤 차",
};

const SAMPLE: [Fuel, number][] = [
  ["e10", 1.739],
  ["e5", 1.799],
  ["diesel", 1.659],
];

export function Onboarding({ settings, locating, locError, onLocate, onHome, onPlace }: OnboardingProps) {
  const [searching, setSearching] = useState(false);
  const finish = () => updateSettings({ onboarded: true });

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5">
      <div className="flex items-center gap-2.5 pt-5">
        <LogoMark size={30} />
        <span className="text-[17px] font-bold tracking-tight">Tankpreis</span>
      </div>

      <h1 className="mt-8 text-[30px] leading-[1.25] font-bold tracking-[-0.02em]">
        가장 싼 주유소를
        <br />
        3초 안에.
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
        독일 공식 실시간 가격(MTS-K)에 내 Fleet Card 할인까지 반영해 비교해요.
      </p>

      <div className="mt-6 rounded-[var(--radius-card)] bg-board px-4 py-3 ring-1 ring-board-line" aria-hidden="true">
        {SAMPLE.map(([fuel, price]) => (
          <div key={fuel} className="flex items-baseline justify-between border-board-line py-1.5 [&+&]:border-t">
            <span className="text-[14px] font-medium text-board-ink-2">{FUEL_LABELS[fuel]}</span>
            <Price price={price} className="text-[26px] font-bold text-board-ink" />
          </div>
        ))}
      </div>

      <fieldset className="mt-8">
        <legend className="text-[17px] font-semibold">어떤 연료를 넣으세요?</legend>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="연료">
          {FUELS.map((f) => {
            const checked = settings.fuel === f;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => updateSettings({ fuel: f })}
                className={`flex min-h-[76px] flex-col items-start justify-center rounded-[12px] px-3 py-2.5 text-left ring-inset transition-colors ${
                  checked ? "bg-accent-soft ring-2 ring-accent" : "bg-surface ring-1 ring-line"
                }`}
              >
                <span className={`text-[16px] font-bold ${checked ? "text-accent-soft-ink" : ""}`} lang="de">
                  {FUEL_LABELS[f]}
                </span>
                <span className={`mt-0.5 text-[12px] leading-snug ${checked ? "text-accent-soft-ink" : "text-ink-2"}`}>
                  {FUEL_HINTS[f]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] text-ink-3">나중에 화면 아래에서 언제든 바꿀 수 있어요.</p>
      </fieldset>

      <div className="flex-1" />

      <div className="sticky bottom-0 -mx-5 mt-6 bg-bg px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {locError && (
          <div className="mb-3 rounded-[12px] bg-warn-soft px-4 py-3 text-warn-ink" role="alert">
            <p className="text-[14px] font-semibold">{LOC_ERROR_TEXT[locError]} 집이나 우편번호 기준으로 볼 수 있어요.</p>
            {locError === "denied" && (
              <div className="mt-1 [&_p]:text-warn-ink [&_strong]:text-warn-ink">
                <DeniedHelp />
              </div>
            )}
          </div>
        )}

        {searching ? (
          <div className="mb-3 rounded-[12px] bg-surface p-3 ring-1 ring-line">
            <PlaceSearch
              autoFocus
              onPick={(p) => {
                onPlace(p);
                finish();
              }}
            />
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={locating}
          onClick={async () => {
            if (await onLocate()) finish();
          }}
        >
          <LocateIcon size={20} className={locating ? "animate-spin-slow" : ""} />
          {locating ? "위치 찾는 중…" : "내 주변 가격 보기"}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="text-[15px]"
            onClick={() => {
              onHome();
              finish();
            }}
          >
            <HomeIcon size={18} />
            {settings.home.label} 기준
          </Button>
          <Button variant="secondary" className="text-[15px]" onClick={() => setSearching((v) => !v)} aria-expanded={searching}>
            <SearchIcon size={18} />
            우편번호로 찾기
          </Button>
        </div>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-3">
          위치는 주변 주유소를 찾는 데만 쓰고, 서버에는 약 1km 단위로 반올림해 보내요.
        </p>
      </div>
    </main>
  );
}
