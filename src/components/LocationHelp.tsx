"use client";
import { useT, type MessageKey } from "@/i18n";
import type { LocError } from "@/hooks/useNearby";

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
