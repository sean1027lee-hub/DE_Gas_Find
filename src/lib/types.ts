import type { BrandGroup } from "./brands";

export type Fuel = "e10" | "e5" | "diesel";

export const FUELS: Fuel[] = ["e10", "e5", "diesel"];

/** Station names and fuel names stay in German as on the pump. */
export const FUEL_LABELS: Record<Fuel, string> = {
  e10: "Super E10",
  e5: "Super E5",
  diesel: "Diesel",
};

export const FUEL_SHORT_LABELS: Record<Fuel, string> = {
  e10: "E10",
  e5: "E5",
  diesel: "Diesel",
};

/** `null` = fuel not sold / no price reported. */
export type FuelPrices = Record<Fuel, number | null>;

export interface Station {
  id: string;
  name: string;
  brand: string;
  brandGroup: BrandGroup | null;
  street: string;
  houseNumber: string;
  postCode: string;
  place: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  prices: FuelPrices;
}

export type DataSource = "live" | "mock";

export interface StationsResponse {
  stations: Station[];
  /** ISO timestamp of the upstream fetch (cache hits keep the original time). */
  fetchedAt: string;
  source: DataSource;
}

export type PriceStatus = "open" | "closed" | "no prices" | "not found";

export interface PriceUpdate {
  status: PriceStatus;
  prices: FuelPrices;
}

export interface PricesResponse {
  prices: Record<string, PriceUpdate>;
  fetchedAt: string;
  source: DataSource;
}

export interface OpeningTime {
  text: string;
  start: string;
  end: string;
}

export interface StationDetail {
  id: string;
  openingTimes: OpeningTime[];
  overrides: string[];
  wholeDay: boolean;
  isOpen: boolean;
}

export interface GeocodeResult {
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
}

export interface ApiError {
  error: string;
  code: "bad_request" | "no_key" | "upstream" | "rate_limited" | "not_found";
}
