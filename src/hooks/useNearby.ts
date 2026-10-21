"use client";
/**
 * Location + nearby stations. Shows the last result instantly, then refreshes in
 * the background. The exact position never leaves the device: requests use a
 * ~1 km grid and distances are computed locally.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { distanceKm, snapToGrid, type LatLng } from "@/lib/geo";
import {
  lastResultStore,
  refreshFavoriteSnapshots,
  settingsStore,
  updateSettings,
  type LocationMode,
  type Place,
} from "@/lib/store";
import type { ApiError, StationsResponse } from "@/lib/types";

export interface Origin extends Place {
  mode: LocationMode;
}

export type LocError = "denied" | "unavailable" | "timeout" | "unsupported";

export type FetchStatus = "idle" | "loading" | "refreshing" | "ready" | "error";

export interface FetchError {
  code: ApiError["code"] | "offline" | "network";
  message: string;
}

/** Always fetch the max radius: radius chips then switch instantly without a request. */
const FETCH_RADIUS = 25;
const FRESH_MS = 5 * 60_000;
/** Refetch when the origin moved further than this from the last request. */
const REFETCH_DISTANCE_KM = 1;

export const GPS_LABEL = "현재 위치";

async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw {
      code: navigator.onLine ? "network" : "offline",
      message: navigator.onLine ? "서버에 연결하지 못했어요." : "오프라인 상태예요.",
    } satisfies FetchError;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw { code: body?.code ?? "upstream", message: body?.error ?? "가격을 불러오지 못했어요." } satisfies FetchError;
  }
  return res.json() as Promise<T>;
}

const labelCache = new Map<string, string>();

async function reverseLabel(p: LatLng): Promise<string | null> {
  const g = snapToGrid(p);
  const key = `${g.lat},${g.lng}`;
  if (labelCache.has(key)) return labelCache.get(key)!;
  try {
    const { label } = await fetchJson<{ label: string | null }>(`/api/geocode?lat=${g.lat}&lng=${g.lng}`, 5000);
    if (label) labelCache.set(key, label);
    return label;
  } catch {
    return null;
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    }),
  );
}

async function permissionState(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

export function useNearby(enabled: boolean) {
  const last = lastResultStore.use();
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<LocError | null>(null);
  /** Origin restored from the last session instead of a fresh GPS fix. */
  const [stalePosition, setStalePosition] = useState(false);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<FetchError | null>(null);
  const requestId = useRef(0);
  const lastLocateAt = useRef(0);

  const load = useCallback(async (target: Place, force: boolean) => {
    const current = lastResultStore.get();
    if (!force && current) {
      const age = Date.now() - new Date(current.response.fetchedAt).getTime();
      const moved = distanceKm(current.origin, target);
      if (age < FRESH_MS && moved < REFETCH_DISTANCE_KM) {
        setStatus("ready");
        return;
      }
    }
    const id = ++requestId.current;
    const hasNearbyData = current && distanceKm(current.origin, target) < REFETCH_DISTANCE_KM * 3;
    setStatus(hasNearbyData ? "refreshing" : "loading");
    setError(null);
    const g = snapToGrid(target);
    try {
      const response = await fetchJson<StationsResponse>(
        `/api/stations?lat=${g.lat}&lng=${g.lng}&rad=${FETCH_RADIUS}`,
      );
      if (id !== requestId.current) return;
      lastResultStore.set({ response, origin: { lat: target.lat, lng: target.lng, label: target.label } });
      refreshFavoriteSnapshots(response.stations);
      setStatus("ready");
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e as FetchError);
      setStatus("error");
    }
  }, []);

  const applyOrigin = useCallback(
    (next: Origin, force = false) => {
      setOrigin(next);
      void load(next, force);
    },
    [load],
  );

  /** Ask for GPS. Only call from a user gesture, or when permission was granted before. */
  const locate = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setLocError("unsupported");
      return false;
    }
    setLocating(true);
    setLocError(null);
    try {
      const pos = await getPosition();
      lastLocateAt.current = Date.now();
      setStalePosition(false);
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      updateSettings({ locationMode: "gps", gpsGranted: true });
      applyOrigin({ ...p, label: GPS_LABEL, mode: "gps" });
      void reverseLabel(p).then((label) => {
        if (label) setOrigin((o) => (o && o.mode === "gps" && o.lat === p.lat ? { ...o, label } : o));
      });
      return true;
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      const err: LocError = code === 1 ? "denied" : code === 3 ? "timeout" : "unavailable";
      setLocError(err);
      if (err === "denied") updateSettings({ gpsGranted: false });
      // Never leave the user on an empty screen: fall back to home.
      setOrigin((o) => {
        if (o) return o;
        const { home } = settingsStore.get();
        const fallback: Origin = { ...home, mode: "home" };
        void load(fallback, false);
        return fallback;
      });
      return false;
    } finally {
      setLocating(false);
    }
  }, [applyOrigin, load]);

  const selectHome = useCallback(() => {
    const { home } = settingsStore.get();
    updateSettings({ locationMode: "home" });
    setLocError(null);
    setStalePosition(false);
    applyOrigin({ ...home, mode: "home" });
  }, [applyOrigin]);

  const selectPlace = useCallback(
    (place: Place) => {
      updateSettings({ locationMode: "place", place });
      setLocError(null);
      setStalePosition(false);
      applyOrigin({ ...place, mode: "place" });
    },
    [applyOrigin],
  );

  const refresh = useCallback(async () => {
    if (origin?.mode === "gps" && Date.now() - lastLocateAt.current > 60_000) {
      const ok = await locate();
      if (ok) return;
    }
    const target = origin ?? lastResultStore.get()?.origin;
    if (target) await load(target, true);
  }, [origin, locate, load]);

  // Boot: decide the origin once the app is ready.
  const booted = useRef(false);
  useEffect(() => {
    if (!enabled || booted.current) return;
    booted.current = true;
    const s = settingsStore.get();
    void (async () => {
      if (s.locationMode === "home") return selectHome();
      if (s.locationMode === "place" && s.place) return selectPlace(s.place);
      const state = await permissionState();
      // iOS web apps often report "prompt" again on launch; once the user has granted
      // access through our button we re-request without another tap.
      if (state === "granted" || (state !== "denied" && s.gpsGranted)) {
        await locate();
        return;
      }
      const cached = lastResultStore.get();
      if (state === "denied") setLocError("denied");
      if (cached && state !== "denied") {
        setStalePosition(true);
        applyOrigin({ ...cached.origin, mode: "gps" });
      } else {
        applyOrigin({ ...s.home, mode: "home" });
      }
    })();
  }, [enabled, locate, selectHome, selectPlace, applyOrigin]);

  // Coming back to the app: re-locate / refresh if stale.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const current = lastResultStore.get();
      const age = current ? Date.now() - new Date(current.response.fetchedAt).getTime() : Infinity;
      if (origin?.mode === "gps" && settingsStore.get().gpsGranted && Date.now() - lastLocateAt.current > 120_000) {
        void locate();
      } else if (origin && age > FRESH_MS) {
        void load(origin, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, origin, locate, load]);

  // Retry automatically when the connection comes back.
  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => origin && void load(origin, false);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled, origin, load]);

  return {
    origin,
    /** Where distances are measured from: live origin, else the cached one. */
    effectiveOrigin: (origin ?? last?.origin ?? null) as Place | null,
    data: last?.response ?? null,
    dataOrigin: last?.origin ?? null,
    status,
    error,
    locating,
    locError,
    stalePosition,
    locate,
    selectHome,
    selectPlace,
    refresh,
  };
}
