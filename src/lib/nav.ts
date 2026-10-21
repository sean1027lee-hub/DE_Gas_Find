import type { LatLng } from "./geo";

export type NavApp = "apple" | "google";

export const NAV_APP_LABELS: Record<NavApp, string> = {
  apple: "Apple 지도",
  google: "Google 지도",
};

/** Apple Maps universal link: opens the Maps app on iOS, maps.apple.com elsewhere. */
export function appleMapsUrl(dest: LatLng, label?: string): string {
  const params = new URLSearchParams({ daddr: `${dest.lat},${dest.lng}`, dirflg: "d" });
  if (label) params.set("q", label);
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Google Maps URLs API: opens the app when installed, the website otherwise. */
export function googleMapsUrl(dest: LatLng): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${dest.lat},${dest.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function navUrl(app: NavApp, dest: LatLng, label?: string): string {
  return app === "apple" ? appleMapsUrl(dest, label) : googleMapsUrl(dest);
}
