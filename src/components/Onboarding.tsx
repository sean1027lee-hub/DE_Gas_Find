"use client";
import { useState } from "react";
import { useT } from "@/i18n";
import type { LocError } from "@/hooks/useNearby";
import { updateSettings, type Place, type Settings } from "@/lib/store";
import { FUEL_LABELS, FUELS, type Fuel } from "@/lib/types";
import { Button } from "./Button";
import { HomeIcon, LocateIcon, SearchIcon } from "./icons";
import { DeniedHelp, LOC_ERROR_KEY } from "./LocationHelp";
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

const SAMPLE: [Fuel, number][] = [
  ["e10", 1.739],
  ["e5", 1.799],
  ["diesel", 1.659],
];

export function Onboarding({ settings, locating, locError, onLocate, onHome, onPlace }: OnboardingProps) {
  const { t } = useT();
  const [searching, setSearching] = useState(false);
  const finish = () => updateSettings({ onboarded: true });

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5">
      <div className="flex items-center gap-2.5 pt-5">
        <LogoMark size={30} />
        <span className="text-title font-bold tracking-tight">{t("app.name")}</span>
      </div>

      <h1 className="mt-8 text-display-sm leading-[1.25] font-extrabold tracking-[-0.02em]">
        {t("onb.headline1")}
        <br />
        {t("onb.headline2")}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-2">{t("onb.lede")}</p>

      <div className="mt-6 rounded-[var(--radius-card)] bg-board px-4 py-3 ring-1 ring-board-line" aria-hidden="true">
        {SAMPLE.map(([fuel, price]) => (
          <div key={fuel} className="flex items-baseline justify-between border-board-line py-1.5 [&+&]:border-t">
            <span className="text-sm font-medium text-board-ink-2">{FUEL_LABELS[fuel]}</span>
            <Price price={price} className="text-price font-extrabold text-board-ink" />
          </div>
        ))}
      </div>

      <fieldset className="mt-8">
        <legend className="text-title font-semibold">{t("onb.fuelQ")}</legend>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2" role="radiogroup" aria-label={t("dock.fuel")}>
          {FUELS.map((f) => {
            const checked = settings.fuel === f;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => updateSettings({ fuel: f })}
                className={`flex min-h-[4.75rem] flex-col items-start justify-center rounded-[12px] px-3 py-2.5 text-left ring-inset transition-colors ${
                  checked ? "bg-accent-soft ring-2 ring-accent" : "bg-surface ring-1 ring-line"
                }`}
              >
                <span className={`text-base font-bold ${checked ? "text-accent-soft-ink" : ""}`} lang="de">
                  {FUEL_LABELS[f]}
                </span>
                <span className={`mt-0.5 text-xs leading-snug ${checked ? "text-accent-soft-ink" : "text-ink-2"}`}>
                  {t(`fuel.hint.${f}`)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-meta text-ink-3">{t("onb.fuelLater")}</p>
      </fieldset>

      <div className="flex-1" />

      <div className="sticky bottom-0 -mx-5 mt-6 bg-bg px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {locError && (
          <div className="mb-3 rounded-[12px] bg-warn-soft px-4 py-3 text-warn-ink" role="alert">
            <p className="text-sm font-semibold">
              {t(LOC_ERROR_KEY[locError])} {t("onb.locErrorSuffix")}
            </p>
            {locError === "denied" && <DeniedHelp />}
          </div>
        )}

        {searching && (
          <div className="mb-3 rounded-[12px] bg-surface p-3 ring-1 ring-line">
            <PlaceSearch
              autoFocus
              onPick={(p) => {
                onPlace(p);
                finish();
              }}
            />
          </div>
        )}

        <Button
          className="w-full"
          disabled={locating}
          onClick={async () => {
            if (await onLocate()) finish();
          }}
        >
          <LocateIcon size={20} className={locating ? "animate-spin-slow" : ""} />
          {locating ? t("header.locating") : t("onb.cta")}
        </Button>
        <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
          <Button
            variant="secondary"
            className="text-ui"
            onClick={() => {
              onHome();
              finish();
            }}
          >
            <HomeIcon size={18} />
            {t("onb.homeBtn", { place: settings.home.label })}
          </Button>
          <Button variant="secondary" className="text-ui" onClick={() => setSearching((v) => !v)} aria-expanded={searching}>
            <SearchIcon size={18} />
            {t("onb.search")}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">{t("onb.privacy")}</p>
      </div>
    </main>
  );
}
