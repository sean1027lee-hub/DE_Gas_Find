"use client";
/**
 * Map view (loaded on demand). Markers are price labels with a tier shape
 * (▼ ━ ▲) and colour relative to the current result; the cheapest uses the
 * price-sign style. Tapping a pin opens a bottom card with directions
 * (Google-Maps style); "Details" opens the full sheet.
 */
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { translate, useT, type Lang } from "@/i18n";
import { formatCtDiff, formatDistance, priceParts, priceString } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { navUrl, type NavApp } from "@/lib/nav";
import type { PriceTier, RankResult, RankedStation } from "@/lib/pricing";
import type { Station } from "@/lib/types";
import { Button, LinkButton } from "./Button";
import { CloseIcon, MapIcon, NavigationIcon } from "./icons";
import { AnimatedPrice } from "./Price";
import { StatusMessage } from "./StatusMessage";
import { nameWithoutBrand, stationTitle } from "./station-text";
import { TierBadge, TierIcon, tierIconSvg } from "./Tier";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const PIN_CLASS: Record<PriceTier, string> = {
  low: "bg-low-solid text-on-low ring-1 ring-black/10",
  // Yellow is only 1.8:1 on light map tiles: always outline it.
  mid: "bg-mid-solid text-on-mid ring-[1.5px] ring-mid",
  high: "bg-high-solid text-on-high ring-1 ring-black/10",
};

interface MapViewProps {
  result: RankResult | null;
  origin: LatLng | null;
  radiusKm: number;
  dark: boolean;
  navApp: NavApp;
  onSelect: (station: Station) => void;
  onShowList: () => void;
}

type Entry = { marker: Marker; el: HTMLButtonElement; item: RankedStation };

function circle(center: LatLng, km: number, steps = 72): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const latR = km / 111.32;
  const lngR = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    coords.push([center.lng + lngR * Math.sin(a), center.lat + latR * Math.cos(a)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

function boundsFor(center: LatLng, km: number): maplibregl.LngLatBoundsLike {
  const latR = km / 111.32;
  const lngR = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  return [
    [center.lng - lngR, center.lat - latR],
    [center.lng + lngR, center.lat + latR],
  ];
}

function markerElement(item: RankedStation, lang: Lang, onSelect: () => void): HTMLButtonElement {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string>) => translate(lang, k, v);
  const { main, sup } = priceParts(item.price);
  const [euros, cents] = main.split(",");
  const closed = !item.station.isOpen;
  const el = document.createElement("button");
  el.type = "button";
  const visible = `${item.isCheapest ? `${t("tier.cheapest")} ` : ""}${priceString(item.price)}`;
  el.setAttribute(
    "aria-label",
    [
      visible,
      stationTitle(item.station),
      item.isCheapest ? t("a11y.cheapestNearby") : closed ? t("status.closed") : t(`tier.${item.tier}`),
    ].join(", "),
  );
  const tone = closed
    ? "bg-surface-2 text-ink-3 ring-1 ring-line"
    : item.isCheapest
      ? "bg-board text-board-ink ring-2 ring-low-solid text-base px-2.5 py-1.5"
      : PIN_CLASS[item.tier];
  el.className = `num relative inline-flex items-center gap-1 rounded-[9px] px-2 py-1 text-sm leading-none font-extrabold shadow-[0_2px_6px_rgb(0_0_0/0.22)] ${tone}`;
  el.dataset.tier = closed ? "closed" : item.tier;
  const icon = !closed && !item.isCheapest ? tierIconSvg(item.tier) : "";
  const badge = item.isCheapest
    ? `<span class="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-low-solid px-1 py-px font-sans text-[11px] font-bold text-on-low">${t("tier.cheapest")}</span>`
    : "";
  el.innerHTML = `${badge}${icon}<span>${euros}<span class="price-comma">,</span>${cents}<span class="price-sup">${sup}</span></span>`;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect();
  });
  return el;
}

function userElement(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.className = "size-[18px] rounded-full border-[3px] border-white bg-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_25%,transparent)]";
  return el;
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Greedy label placement: cheapest first (closed last). A label that would overlap
 * an already placed one collapses to a small coloured dot; zooming in brings it back.
 * The selected station always keeps its label.
 */
function declutterMarkers(map: MlMap, list: Entry[], selectedId: string | null) {
  const order = [...list].sort(
    (a, b) =>
      Number(b.item.station.id === selectedId) - Number(a.item.station.id === selectedId) ||
      Number(b.item.isCheapest) - Number(a.item.isCheapest) ||
      Number(b.item.station.isOpen) - Number(a.item.station.isOpen) ||
      a.item.price - b.item.price,
  );
  const placed: { x1: number; x2: number; y1: number; y2: number }[] = [];
  for (const { marker, el, item } of order) {
    const p = map.project(marker.getLngLat());
    const w = item.isCheapest ? 84 : 76;
    const h = item.isCheapest ? 52 : 30;
    const box = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y - h - 4, y2: p.y - 4 };
    const overlaps = placed.some((b) => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1);
    el.classList.toggle("tp-dot", overlaps);
    const selected = item.station.id === selectedId;
    el.classList.toggle("tp-selected", selected);
    el.style.zIndex = selected ? "2000" : (el.dataset.z ?? "0");
    el.setAttribute("aria-pressed", String(selected));
    if (!overlaps) placed.push(box);
  }
}

export default function MapView({ result, origin, radiusKm, dark, navApp, onSelect, onShowList }: MapViewProps) {
  const { t, lang } = useT();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Entry[]>([]);
  const userMarker = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(() => typeof window !== "undefined" && !webglSupported());
  const [styleReady, setStyleReady] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  // Create the map once.
  useEffect(() => {
    if (!container.current || failed) return;
    const center = origin ?? { lat: 49.8728, lng: 8.6512 };
    let map: MlMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: dark ? STYLES.dark : STYLES.light,
        bounds: boundsFor(center, radiusKm),
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    map.touchZoomRotate.disableRotation();
    const declutter = () => declutterMarkers(map, markers.current, selectedRef.current);
    map.on("moveend", declutter);
    map.on("click", () => setSelectedId(null));
    map.on("style.load", () => setStyleReady((n) => n + 1));
    map.on("error", (e) => {
      if (!map.isStyleLoaded() && (e.error as { status?: number })?.status !== undefined) setFailed(true);
    });
    mapRef.current = map;
    return () => {
      map.off("moveend", declutter);
      map.remove();
      mapRef.current = null;
      markers.current = [];
      userMarker.current = null;
    };
    // Recreating on origin/radius would reset the camera; those are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  // Theme switch.
  useEffect(() => {
    mapRef.current?.setStyle(dark ? STYLES.dark : STYLES.light);
  }, [dark]);

  // Radius circle (re-added after every style load).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin || !styleReady) return;
    const data = circle(origin, radiusKm);
    const src = map.getSource("radius") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource("radius", { type: "geojson", data });
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#1d4ed8";
      map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": accent, "fill-opacity": 0.05 } });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": accent, "line-width": 1.5, "line-opacity": 0.6, "line-dasharray": [2, 2] },
      });
    }
  }, [origin, radiusKm, styleReady, dark]);

  // Camera follows origin / radius changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    map.fitBounds(boundsFor(origin, radiusKm), {
      padding: 24,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400,
    });
  }, [origin, radiusKm]);

  // User position.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    if (!userMarker.current) userMarker.current = new maplibregl.Marker({ element: userElement() });
    userMarker.current.setLngLat([origin.lng, origin.lat]).addTo(map);
  }, [origin, failed]);

  // Price markers. Cheaper stations render on top.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.marker.remove());
    if (!result) return;
    const items = [...result.closed, ...[...result.open].sort((a, b) => b.price - a.price)];
    markers.current = items.map((item, i) => {
      const el = markerElement(item, lang, () => setSelectedId(item.station.id));
      el.style.zIndex = String(item.isCheapest ? 1000 : i);
      el.dataset.z = el.style.zIndex;
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -4] })
        .setLngLat([item.station.lng, item.station.lat])
        .addTo(map);
      return { marker, el, item };
    });
    declutterMarkers(map, markers.current, selectedRef.current);
  }, [result, failed, lang]);

  // Selection: keep the selected pin labelled and on top.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    declutterMarkers(map, markers.current, selectedId);
  }, [selectedId]);

  // Escape clears the selection.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  if (failed) {
    return (
      <StatusMessage
        icon={<MapIcon size={22} />}
        title={t("map.failed")}
        description={t("map.failedDesc")}
        actions={<Button onClick={onShowList}>{t("map.showList")}</Button>}
      />
    );
  }

  const selected = result ? [...result.open, ...result.closed].find((r) => r.station.id === selectedId) ?? null : null;
  const cheapest = result?.cheapest;

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="region" aria-label={t("map.region")} />

      {cheapest && !selected && (
        <button
          type="button"
          onClick={() => setSelectedId(cheapest.station.id)}
          className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-[12px] bg-board px-3 py-2 text-left text-board-ink shadow-[0_4px_14px_rgb(0_0_0/0.25)] ring-1 ring-board-line"
        >
          <span className="text-xs text-board-ink-2">{t("tier.cheapest")}</span>
          <AnimatedPrice price={cheapest.price} className="text-xl font-extrabold" label={t("a11y.cheapestNearby")} />
          <span className="truncate text-sm font-semibold" lang="de">
            {stationTitle(cheapest.station)}
          </span>
        </button>
      )}

      {!selected && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold shadow-[0_2px_8px_rgb(0_0_0/0.15)]">
          {(["low", "mid", "high"] as PriceTier[]).map((tier) => (
            <span key={tier} className={`flex items-center gap-1 ${tier === "low" ? "text-low" : tier === "mid" ? "text-mid" : "text-high"}`}>
              <TierIcon tier={tier} size={11} />
              {t(`tier.${tier}`)}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <MapCard
          item={selected}
          navApp={navApp}
          onDetails={() => onSelect(selected.station)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function MapCard({
  item,
  navApp,
  onDetails,
  onClose,
}: {
  item: RankedStation;
  navApp: NavApp;
  onDetails: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const { station, price, distanceKm, diffToMin, tier, isCheapest } = item;
  const closed = !station.isOpen;
  const name = `${stationTitle(station)} ${station.brand ? nameWithoutBrand(station) : ""}`.trim();
  const app = t(navApp === "apple" ? "nav.apple" : "nav.google");
  return (
    <section
      aria-label={name}
      className="animate-sheet-in absolute inset-x-3 bottom-3 rounded-[16px] bg-surface p-3.5 shadow-[0_6px_24px_rgb(0_0_0/0.25)]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight" lang="de">
            <strong className="font-semibold">{stationTitle(station)}</strong>
            {station.brand && <span className="ml-1.5 text-ink-2">{nameWithoutBrand(station)}</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-2">
            <span className="tnum">{formatDistance(distanceKm)}</span>
            <span>·</span>
            <span>{t(closed ? "status.closed" : "status.open")}</span>
            {!closed &&
              (isCheapest || diffToMin === 0 ? (
                <TierBadge tier="low">{t("tier.cheapest")}</TierBadge>
              ) : (
                <TierBadge tier={tier}>
                  <span className="tnum">{formatCtDiff(diffToMin)}</span>
                </TierBadge>
              ))}
          </p>
        </div>
        <AnimatedPrice price={price} className="text-price leading-none font-extrabold" />
        <button
          type="button"
          onClick={onClose}
          className="-mt-1 -mr-1.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 active:bg-surface-2"
          aria-label={t("map.deselect")}
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <LinkButton
          href={navUrl(navApp, station, name)}
          target="_blank"
          rel="noopener"
          className="flex-1"
          aria-label={t("hero.navigateAria", { name, app })}
        >
          <NavigationIcon size={18} />
          {t("sheet.navWith", { app })}
        </LinkButton>
        <Button variant="secondary" onClick={onDetails}>
          {t("map.details")}
        </Button>
      </div>
    </section>
  );
}
