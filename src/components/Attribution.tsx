"use client";
import { useT } from "@/i18n";

export function Attribution() {
  const { t } = useT();
  return (
    <p className="px-4 pt-6 pb-4 text-center text-xs leading-relaxed text-ink-3">
      {t("attr.prices")}{" "}
      <a href="https://creativecommons.tankerkoenig.de" target="_blank" rel="noopener" className="underline underline-offset-2">
        Tankerkönig
      </a>{" "}
      / MTS-K (
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" className="underline underline-offset-2">
        CC BY 4.0
      </a>
      )
    </p>
  );
}
