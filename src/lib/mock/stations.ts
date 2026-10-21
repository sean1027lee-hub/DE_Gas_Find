/**
 * Sample stations around Darmstadt for mock mode. Street names are real places in
 * the area, but stations, coordinates and prices are invented — the UI always
 * shows a "sample data" banner in mock mode.
 */

export type HoursKind = "h24" | "std" | "short";

export interface MockStation {
  id: string;
  name: string;
  /** Raw brand string as Tankerkönig delivers it (mixed spellings on purpose). */
  brand: string;
  street: string;
  houseNumber: string;
  postCode: number;
  place: string;
  /** Offset from Darmstadt centre in km (east, north). */
  km: [number, number];
  hours: HoursKind;
  /** Brand/location premium in ct (motorway stations are much pricier). */
  premiumCt: number;
  sells: { e5: boolean; e10: boolean; diesel: boolean };
}

const ALL = { e5: true, e10: true, diesel: true };

export const MOCK_CENTER = { lat: 49.8728, lng: 8.6512 };

export const MOCK_STATIONS: MockStation[] = [
  { id: "a1c0f1e2-0001-4a00-8000-000000000001", name: "Aral Tankstelle", brand: "ARAL", street: "Heidelberger Straße", houseNumber: "118", postCode: 64285, place: "Darmstadt", km: [0.3, -1.6], hours: "h24", premiumCt: 3, sells: ALL },
  { id: "a1c0f1e2-0002-4a00-8000-000000000002", name: "Shell Darmstadt Rheinstr.", brand: "Shell", street: "Rheinstraße", houseNumber: "46", postCode: 64283, place: "Darmstadt", km: [-0.9, 0.2], hours: "std", premiumCt: 4, sells: ALL },
  { id: "a1c0f1e2-0003-4a00-8000-000000000003", name: "JET DARMSTADT PFUNGSTAEDTER STR.", brand: "JET", street: "PFUNGSTAEDTER STR.", houseNumber: "93", postCode: 64297, place: "DARMSTADT", km: [-1.8, -2.9], hours: "std", premiumCt: -2, sells: ALL },
  { id: "a1c0f1e2-0004-4a00-8000-000000000004", name: "TotalEnergies Darmstadt", brand: "TotalEnergies", street: "Kasinostraße", houseNumber: "3", postCode: 64293, place: "Darmstadt", km: [-1.2, 0.9], hours: "std", premiumCt: 0, sells: ALL },
  { id: "a1c0f1e2-0005-4a00-8000-000000000005", name: "Esso Station Darmstadt", brand: "ESSO", street: "Frankfurter Straße", houseNumber: "62", postCode: 64293, place: "Darmstadt", km: [0.1, 1.8], hours: "h24", premiumCt: 2, sells: ALL },
  { id: "a1c0f1e2-0006-4a00-8000-000000000006", name: "bft Tankstelle Eschollbrücker", brand: "bft", street: "Eschollbrücker Straße", houseNumber: "26", postCode: 64295, place: "Darmstadt", km: [-2.2, -1.1], hours: "short", premiumCt: -3, sells: ALL },
  { id: "a1c0f1e2-0007-4a00-8000-000000000007", name: "Aral Dieburger Straße", brand: "Aral", street: "Dieburger Straße", houseNumber: "241", postCode: 64287, place: "Darmstadt", km: [2.3, 0.6], hours: "h24", premiumCt: 3, sells: ALL },
  { id: "a1c0f1e2-0008-4a00-8000-000000000008", name: "Shell Darmstadt-Eberstadt", brand: "Shell", street: "Heidelberger Landstraße", houseNumber: "192", postCode: 64297, place: "Darmstadt", km: [0.1, -6.2], hours: "std", premiumCt: 3, sells: ALL },
  { id: "a1c0f1e2-0009-4a00-8000-000000000009", name: "AVIA Xpress Griesheim", brand: "AVIA", street: "Flughafenstraße", houseNumber: "5", postCode: 64347, place: "Griesheim", km: [-6.5, -0.3], hours: "std", premiumCt: -1, sells: ALL },
  { id: "a1c0f1e2-0010-4a00-8000-000000000010", name: "Raiffeisen Tankstelle Ober-Ramstadt", brand: "Raiffeisen", street: "Darmstädter Straße", houseNumber: "21", postCode: 64372, place: "Ober-Ramstadt", km: [6.8, -4.0], hours: "short", premiumCt: -1, sells: ALL },
  { id: "a1c0f1e2-0011-4a00-8000-000000000011", name: "JET WEITERSTADT", brand: "JET", street: "Gräfenhäuser Straße", houseNumber: "67", postCode: 64331, place: "Weiterstadt", km: [-4.4, 4.6], hours: "h24", premiumCt: -2, sells: ALL },
  { id: "a1c0f1e2-0012-4a00-8000-000000000012", name: "TotalEnergies Pfungstadt", brand: "TOTAL", street: "Eberstädter Straße", houseNumber: "101", postCode: 64319, place: "Pfungstadt", km: [-4.0, -5.7], hours: "std", premiumCt: 0, sells: ALL },
  { id: "a1c0f1e2-0013-4a00-8000-000000000013", name: "Aral Mühltal", brand: "ARAL", street: "Ober-Ramstädter Straße", houseNumber: "2", postCode: 64367, place: "Mühltal", km: [3.9, -3.8], hours: "std", premiumCt: 3, sells: ALL },
  { id: "a1c0f1e2-0014-4a00-8000-000000000014", name: "Esso Arheilgen", brand: "ESSO", street: "Frankfurter Landstraße", houseNumber: "210", postCode: 64291, place: "Darmstadt", km: [0.6, 5.4], hours: "std", premiumCt: 2, sells: ALL },
  { id: "a1c0f1e2-0015-4a00-8000-000000000015", name: "Shell Kranichstein", brand: "Shell", street: "Bartningstraße", houseNumber: "50", postCode: 64289, place: "Darmstadt", km: [3.4, 3.2], hours: "std", premiumCt: 4, sells: ALL },
  { id: "a1c0f1e2-0016-4a00-8000-000000000016", name: "HEM Tankstelle", brand: "HEM", street: "Landwehrstraße", houseNumber: "75", postCode: 64293, place: "Darmstadt", km: [-2.0, 1.6], hours: "std", premiumCt: -2, sells: ALL },
  { id: "a1c0f1e2-0017-4a00-8000-000000000017", name: "Eni Darmstadt", brand: "ENI", street: "Holzhofallee", houseNumber: "15", postCode: 64295, place: "Darmstadt", km: [-0.6, -1.9], hours: "std", premiumCt: 0, sells: ALL },
  { id: "a1c0f1e2-0018-4a00-8000-000000000018", name: "Freie Tankstelle Bessungen", brand: "", street: "Ludwigshöhstraße", houseNumber: "9", postCode: 64285, place: "Darmstadt", km: [1.2, -2.3], hours: "short", premiumCt: -4, sells: { e5: false, e10: true, diesel: true } },
  { id: "a1c0f1e2-0019-4a00-8000-000000000019", name: "bft Griesheim", brand: "bft", street: "Wilhelm-Leuschner-Straße", houseNumber: "40", postCode: 64347, place: "Griesheim", km: [-7.2, -1.2], hours: "std", premiumCt: -3, sells: ALL },
  { id: "a1c0f1e2-0020-4a00-8000-000000000020", name: "Aral Roßdorf", brand: "Aral", street: "Darmstädter Straße", houseNumber: "74", postCode: 64380, place: "Roßdorf", km: [8.4, 0.9], hours: "h24", premiumCt: 2, sells: ALL },
  { id: "a1c0f1e2-0021-4a00-8000-000000000021", name: "Shell Dieburg", brand: "Shell", street: "Frankfurter Straße", houseNumber: "12", postCode: 64807, place: "Dieburg", km: [14.8, 1.4], hours: "std", premiumCt: 3, sells: ALL },
  { id: "a1c0f1e2-0022-4a00-8000-000000000022", name: "TotalEnergies Erzhausen", brand: "TotalEnergies", street: "Bahnhofstraße", houseNumber: "31", postCode: 64390, place: "Erzhausen", km: [-0.4, 9.3], hours: "std", premiumCt: 0, sells: ALL },
  { id: "a1c0f1e2-0023-4a00-8000-000000000023", name: "JET SEEHEIM-JUGENHEIM", brand: "JET", street: "Heidelberger Straße", houseNumber: "50", postCode: 64342, place: "Seeheim-Jugenheim", km: [1.0, -11.2], hours: "h24", premiumCt: -2, sells: ALL },
  { id: "a1c0f1e2-0024-4a00-8000-000000000024", name: "Raiffeisen Groß-Zimmern", brand: "Raiffeisen", street: "Waldstraße", houseNumber: "2", postCode: 64846, place: "Groß-Zimmern", km: [12.1, -2.6], hours: "short", premiumCt: -1, sells: { e5: true, e10: true, diesel: false } },
  { id: "a1c0f1e2-0025-4a00-8000-000000000025", name: "Aral Gräfenhausen West (A5)", brand: "ARAL", street: "BAB A5", houseNumber: "", postCode: 64331, place: "Weiterstadt", km: [-3.0, 7.2], hours: "h24", premiumCt: 16, sells: ALL },
];

export const OPENING_TIMES: Record<HoursKind, { text: string; start: string; end: string }[]> = {
  h24: [],
  std: [
    { text: "Mo-Fr", start: "06:00:00", end: "22:00:00" },
    { text: "Samstag", start: "07:00:00", end: "22:00:00" },
    { text: "Sonntag, Feiertag", start: "08:00:00", end: "21:00:00" },
  ],
  short: [
    { text: "Mo-Fr", start: "07:00:00", end: "20:00:00" },
    { text: "Samstag", start: "08:00:00", end: "18:00:00" },
  ],
};
