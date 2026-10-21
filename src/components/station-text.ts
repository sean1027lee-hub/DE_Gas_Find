import { formatStreet, tidyCase } from "@/lib/format";
import type { Station } from "@/lib/types";

/** Station name without a leading brand ("TotalEnergies Darmstadt" → "Darmstadt"). */
export function nameWithoutBrand(station: Station): string {
  const name = tidyCase(station.name).trim();
  if (!station.brand) return name;
  const re = new RegExp(`^${station.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\-–:]*`, "i");
  const rest = name.replace(re, "").trim();
  return rest || formatStreet(tidyCase(station.street), station.houseNumber) || name;
}

export function stationTitle(station: Station): string {
  return station.brand || tidyCase(station.name);
}

export function stationAddress(station: Station): string {
  const street = formatStreet(tidyCase(station.street), station.houseNumber);
  const place = [station.postCode, tidyCase(station.place)].filter(Boolean).join(" ");
  return [street, place].filter(Boolean).join(", ");
}
