"use client";
import { useState, type ReactNode } from "react";
import { LANG_NAMES, LANGS, persistLangCookie, useT } from "@/i18n";
import type { NavApp } from "@/lib/nav";
import { resetAll, updateSettings, type LangPref, type Place, type Settings, type Theme } from "@/lib/store";
import { FUEL_LABELS, FUELS, FUEL_SHORT_LABELS } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { ChevronRightIcon, HomeIcon } from "./icons";
import { PlaceSearch } from "./PlaceSearch";
import { Segmented } from "./Segmented";
import { Stepper } from "./Stepper";

interface SettingsViewProps {
  settings: Settings;
  currentPosition: Place | null;
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="px-4 pb-2 text-sm font-semibold text-ink-2">{title}</h2>
      <div className="mx-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{children}</div>
      {note && <p className="px-4 pt-2 text-meta leading-relaxed text-ink-3">{note}</p>}
    </section>
  );
}

export function SettingsView({ settings, currentPosition }: SettingsViewProps) {
  const { t } = useT();
  const [homeOpen, setHomeOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const navLabel = (a: NavApp) => t(a === "apple" ? "nav.apple" : "nav.google");

  return (
    <div className="pb-4">
      <Section title={t("set.fuel")}>
        <div className="p-3">
          <Segmented
            label={t("set.fuel")}
            value={settings.fuel}
            onChange={(v) => updateSettings({ fuel: v })}
            options={FUELS.map((f) => ({ value: f, label: <span lang="de">{FUEL_SHORT_LABELS[f]}</span>, ariaLabel: FUEL_LABELS[f] }))}
          />
        </div>
      </Section>

      <Section title={t("set.home")} note={t("set.homeNote")}>
        <button
          type="button"
          onClick={() => setHomeOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
        >
          <HomeIcon size={20} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-base" lang="de">
            {settings.home.label}
          </span>
          <span className="text-sm text-ink-2">{t("common.change")}</span>
          <ChevronRightIcon size={18} className="text-ink-3" />
        </button>
      </Section>

      <Section title={t("set.litresTitle")} note={t("set.litresNote", { litres: settings.litres })}>
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-base">{t("set.litres")}</span>
          <Stepper
            label={t("set.litres")}
            decreaseLabel={t("set.decrease", { label: t("set.litres") })}
            increaseLabel={t("set.increase", { label: t("set.litres") })}
            value={settings.litres}
            onChange={(v) => updateSettings({ litres: v })}
            min={10}
            max={120}
            step={5}
            format={(v) => `${v} L`}
          />
        </div>
      </Section>

      <Section title={t("set.nav")}>
        <div className="p-3">
          <Segmented<NavApp>
            label={t("set.nav")}
            value={settings.navApp}
            onChange={(v) => updateSettings({ navApp: v })}
            options={(["apple", "google"] as NavApp[]).map((a) => ({ value: a, label: navLabel(a) }))}
          />
        </div>
      </Section>

      <Section title={t("set.theme")}>
        <div className="p-3">
          <Segmented<Theme>
            label={t("set.theme")}
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "system", label: t("set.themeSystem") },
              { value: "light", label: t("set.themeLight") },
              { value: "dark", label: t("set.themeDark") },
            ]}
          />
        </div>
      </Section>

      <Section title={t("set.lang")}>
        <div className="p-3">
          <Segmented<LangPref>
            label={t("set.lang")}
            value={settings.lang}
            onChange={(v) => {
              persistLangCookie(v);
              updateSettings({ lang: v });
            }}
            options={[
              { value: "auto", label: t("set.langAuto") },
              ...LANGS.map((l) => ({ value: l, label: <span lang={l}>{LANG_NAMES[l]}</span>, ariaLabel: LANG_NAMES[l] })),
            ]}
            className="flex-wrap"
          />
        </div>
      </Section>

      <Section title={t("set.a2hs")}>
        <p className="px-4 py-3.5 text-ui leading-relaxed text-ink-2">{t("set.a2hsText")}</p>
      </Section>

      <Section title={t("set.about")}>
        <div className="space-y-2 px-4 py-3.5 text-sm leading-relaxed text-ink-2">
          <p>{t("set.aboutPrices")}</p>
          <p>{t("set.aboutBench")}</p>
          <p>{t("set.aboutMap")}</p>
        </div>
        <div className="p-3">
          <Button variant="secondary" className="w-full !text-high" onClick={() => setConfirmReset(true)}>
            {t("set.reset")}
          </Button>
        </div>
      </Section>

      <BottomSheet open={homeOpen} onClose={() => setHomeOpen(false)} title={t("set.homeChange")}>
        {currentPosition && (
          <Button
            variant="secondary"
            className="mb-4 w-full"
            onClick={() => {
              updateSettings({ home: { ...currentPosition, label: currentPosition.label || t("locsheet.home") } });
              setHomeOpen(false);
            }}
          >
            {t("set.useCurrentAsHome")}
          </Button>
        )}
        <PlaceSearch
          autoFocus
          onPick={(p) => {
            updateSettings({ home: p });
            setHomeOpen(false);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("set.resetTitle")}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="flex-1 !bg-high !text-white"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                window.location.reload();
              }}
            >
              {t("set.resetConfirm")}
            </Button>
          </div>
        }
      >
        <p className="text-ui leading-relaxed text-ink-2">{t("set.resetBody")}</p>
      </BottomSheet>
    </div>
  );
}
