"use client";
import { useState, useSyncExternalStore } from "react";
import { useT, type MessageKey } from "@/i18n";
import type { LocError } from "@/hooks/useNearby";
import { inAppBrowser } from "@/lib/inApp";

export const LOC_ERROR_KEY: Record<LocError, MessageKey> = {
  denied: "locerr.denied",
  unavailable: "locerr.unavailable",
  timeout: "locerr.timeout",
  unsupported: "locerr.unsupported",
};

/** How to re-enable location on iPhone; shown only after a denial. */
export function DeniedHelp() {
  const { t } = useT();
  return (
    <ul className="mt-1 list-disc space-y-1 pl-4 text-meta leading-relaxed">
      <li>{t("help.denied.safari")}</li>
      <li>{t("help.denied.app")}</li>
    </ul>
  );
}

const noopSubscribe = () => () => {};

/** The in-app browser's name ("" if unnamed), or null in a normal browser and during SSR. */
export function useInAppBrowser(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => inAppBrowser(navigator.userAgent),
    () => null,
  );
}

/** Explains why location fails inside Threads/Instagram/… and how to open the page in a real browser. */
export function InAppHelp({ app }: { app: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      window.prompt(t("inapp.copy"), location.href);
    }
  };
  return (
    <div className="mt-1 text-meta leading-relaxed">
      <p className="font-semibold">{app ? t("inapp.title", { app }) : t("inapp.titleGeneric")}</p>
      <p className="mt-0.5">{t("inapp.body")}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-2 min-h-11 rounded-[10px] bg-surface px-3 font-semibold text-ink ring-1 ring-line active:bg-surface-2"
      >
        {t("inapp.copy")}
      </button>
      <span className="ml-2" role="status">
        {copied ? t("inapp.copied") : ""}
      </span>
    </div>
  );
}
