export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Snap a coordinate to a ~1 km grid (0.01° ≈ 1.1 km latitude, ≈ 0.7 km longitude in Germany).
 * Used for cache keys and to avoid sending the exact position to the server.
 */
export function snapToGrid(p: LatLng): LatLng {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}

/** Rough bounding box of Germany with a margin; Tankerkönig only covers German stations. */
export function isInGermanyArea(p: LatLng): boolean {
  return p.lat >= 46.8 && p.lat <= 55.5 && p.lng >= 5.4 && p.lng <= 15.6;
}

export function isValidLatLng(p: LatLng): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

export const DARMSTADT: LatLng = { lat: 49.8728, lng: 8.6512 };
