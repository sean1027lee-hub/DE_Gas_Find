"use client";
/**
 * Persistent client state on top of localStorage with useSyncExternalStore.
 * Reads are memoised per key so snapshots stay referentially stable.
 */
import { useSyncExternalStore } from "react";
import { DARMSTADT } from "./geo";
import type { NavApp } from "./nav";
import type { SortMode } from "./pricing";
import type { Fuel, Station, StationsResponse } from "./types";

export type Theme = "system" | "light" | "dark";
export type ViewMode = "list" | "map";
export type LocationMode = "gps" | "home" | "place";
export const RADII = [2, 5, 10, 25] as const;
export type Radius = (typeof RADII)[number];

export interface Place {
  lat: number;
  lng: number;
  label: string;
}

export interface Settings {
  onboarded: boolean;
  fuel: Fuel;
  radiusKm: Radius;
  sort: SortMode;
  view: ViewMode;
  navApp: NavApp;
  theme: Theme;
  /** Litres for the "you save x €" line. */
  litres: number;
  home: Place;
  locationMode: LocationMode;
  /** Last searched place when locationMode = "place". */
  place: Place | null;
  /** The user granted location through our button at least once. */
  gpsGranted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  fuel: "e10",
  radiusKm: 5,
  sort: "price",
  view: "list",
  navApp: "apple",
  theme: "system",
  litres: 50,
  home: { ...DARMSTADT, label: "Darmstadt" },
  locationMode: "gps",
  place: null,
  gpsGranted: false,
};

export interface FavoriteStation {
  station: Station;
  addedAt: string;
}

export interface LastResult {
  response: StationsResponse;
  origin: Place;
}

type Listener = () => void;

const KEYS = {
  settings: "tp:settings",
  favorites: "tp:favorites",
  last: "tp:last",
} as const;

function createStore<T>(key: string, fallback: T, revive: (raw: unknown) => T) {
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;
  const listeners = new Set<Listener>();

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cachedValue;
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      cachedValue = raw === null ? fallback : revive(JSON.parse(raw));
    } catch {
      cachedValue = fallback;
    }
    return cachedValue;
  };

  const write = (value: T) => {
    cachedValue = value;
    try {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(key, raw);
      cachedRaw = raw;
    } catch {
      // Private mode / quota: keep the in-memory value so the session still works.
      cachedRaw = undefined;
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    get: read,
    set: (update: T | ((prev: T) => T)) =>
      write(typeof update === "function" ? (update as (prev: T) => T)(read()) : update),
    clear: () => {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      cachedRaw = undefined;
      cachedValue = fallback;
      listeners.forEach((l) => l());
    },
    use: (): T => useSyncExternalStore(subscribe, read, () => fallback),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export const settingsStore = createStore<Settings>(KEYS.settings, DEFAULT_SETTINGS, (raw) => {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...raw } as Settings & { discount?: unknown };
  delete merged.discount; // removed feature (Fleet Card) — drop stale stored value
  if (!RADII.includes(merged.radiusKm)) merged.radiusKm = DEFAULT_SETTINGS.radiusKm;
  return merged;
});

export const favoritesStore = createStore<FavoriteStation[]>(KEYS.favorites, [], (raw) =>
  Array.isArray(raw) ? (raw as FavoriteStation[]).filter((f) => isObject(f) && isObject(f.station)) : [],
);

export const lastResultStore = createStore<LastResult | null>(KEYS.last, null, (raw) =>
  isObject(raw) && isObject(raw.response) && isObject(raw.origin) ? (raw as unknown as LastResult) : null,
);

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
}

export function toggleFavorite(station: Station) {
  favoritesStore.set((prev) =>
    prev.some((f) => f.station.id === station.id)
      ? prev.filter((f) => f.station.id !== station.id)
      : [...prev, { station, addedAt: new Date().toISOString() }],
  );
}

/** Keep favourite snapshots fresh when the station shows up in a nearby result. */
export function refreshFavoriteSnapshots(stations: Station[]) {
  const favs = favoritesStore.get();
  if (favs.length === 0) return;
  const byId = new Map(stations.map((s) => [s.id, s]));
  let changed = false;
  const next = favs.map((f) => {
    const fresh = byId.get(f.station.id);
    if (!fresh || JSON.stringify(fresh) === JSON.stringify(f.station)) return f;
    changed = true;
    return { ...f, station: fresh };
  });
  if (changed) favoritesStore.set(next);
}

export function resetAll() {
  settingsStore.clear();
  favoritesStore.clear();
  lastResultStore.clear();
}

/** Inline script for <head>: apply the theme before first paint to avoid a flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${KEYS.settings}")||"{}");var t=s.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";if(s.onboarded)document.documentElement.dataset.onboarded="";}catch(e){}})();`;
