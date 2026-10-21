"use client";
import { NearbyIcon, SettingsIcon, StarIcon } from "./icons";

export type Tab = "nearby" | "favorites" | "settings";

const TABS: { id: Tab; label: string; Icon: typeof NearbyIcon }[] = [
  { id: "nearby", label: "주변", Icon: NearbyIcon },
  { id: "favorites", label: "즐겨찾기", Icon: StarIcon },
  { id: "settings", label: "설정", Icon: SettingsIcon },
];

export function TabBar({ tab, onChange, favoriteCount }: { tab: Tab; onChange: (t: Tab) => void; favoriteCount: number }) {
  return (
    <nav aria-label="메인" className="pb-safe border-t border-line">
      <ul className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={active ? "page" : undefined}
                className={`flex h-[54px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active ? "text-accent" : "text-ink-2"
                }`}
              >
                <Icon size={23} strokeWidth={active ? 2.2 : 1.9} />
                <span>
                  {label}
                  {id === "favorites" && favoriteCount > 0 && <span className="sr-only"> {favoriteCount}곳</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
