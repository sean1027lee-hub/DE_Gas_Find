"use client";
import { useT, type MessageKey } from "@/i18n";
import { NearbyIcon, SettingsIcon, StarIcon, TrendIcon } from "./icons";

export type Tab = "nearby" | "compare" | "favorites" | "settings";

const TABS: { id: Tab; label: MessageKey; Icon: typeof NearbyIcon }[] = [
  { id: "nearby", label: "tab.nearby", Icon: NearbyIcon },
  { id: "compare", label: "tab.compare", Icon: TrendIcon },
  { id: "favorites", label: "tab.favorites", Icon: StarIcon },
  { id: "settings", label: "tab.settings", Icon: SettingsIcon },
];

export function TabBar({ tab, onChange, favoriteCount }: { tab: Tab; onChange: (t: Tab) => void; favoriteCount: number }) {
  const { t } = useT();
  return (
    <nav aria-label={t("tab.nav")} className="pb-safe border-t border-line">
      <ul className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab;
          return (
            <li key={id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.375rem] w-full flex-col items-center justify-center gap-0.5 px-1 text-2xs font-semibold ${
                  active ? "text-accent" : "text-ink-2"
                }`}
              >
                <Icon size={23} strokeWidth={active ? 2.2 : 1.9} />
                <span className="max-w-full truncate">
                  {t(label)}
                  {id === "favorites" && favoriteCount > 0 && <span className="sr-only"> {t("tab.favCount", { n: favoriteCount })}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
