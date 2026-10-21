"use client";
/**
 * Map view (loaded on demand). Markers are price labels, coloured by tier
 * relative to the current result; the cheapest uses the price-sign style.
 */
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { priceParts, priceString } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import type { PriceTier, RankResult, RankedStation } from "@/lib/pricing";
import type { Station } from "@/lib/types";
import { Button } from "./Button";
import { MapIcon } from "./icons";
import { Price } from "./Price";
import { StatusMessage } from "./StatusMessage";
import { stationTitle } from "./station-text";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const TIER_CLASS: Record<PriceTier, string> = {
  low: "bg-low-soft text-low ring-low/50",
  mid: "bg-mid-soft text-mid ring-mid/40",
  high: "bg-high-soft text-high ring-high/40",
};

interface MapViewProps {
  result: RankResult | null;
  origin: LatLng | null;
  radiusKm: number;
  dark: boolean;
  onSelect: (station: Station) => void;
  onShowList: () => void;
}

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

function markerElement(item: RankedStation, onSelect: () => void): HTMLElement {
  const { main, sup } = priceParts(item.price);
  const closed = !item.station.isOpen;
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute(
    "aria-label",
    `${stationTitle(item.station)} ${priceString(item.price)} 유로${item.isCheapest ? ", 최저가" : ""}${closed ? ", 영업 종료" : ""}`,
  );
  const tone = closed
    ? "bg-surface-2 text-ink-3 ring-line"
    : item.isCheapest
      ? "bg-board text-board-ink ring-board-line text-[16px] px-2.5 py-1.5"
      : TIER_CLASS[item.tier];
  el.className = `num relative rounded-[9px] px-2 py-1 text-[14px] leading-none font-bold tracking-tight ring-1 shadow-[0_2px_6px_rgb(0_0_0/0.18)] ${tone}`;
  const [euros, cents] = main.split(",");
  el.dataset.tier = closed ? "closed" : item.tier;
  el.innerHTML = `${item.isCheapest ? '<span class="absolute -top-[18px] left-1/2 -translate-x-1/2 rounded-[5px] bg-low px-1 py-px font-sans text-[11px] font-bold text-white dark:text-[#06210f] whitespace-nowrap">최저</span>' : ""}${euros}<span class="price-comma">,</span>${cents}<span class="price-sup">${sup}</span>`;
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

/**
 * Greedy label placement: cheapest first (closed last). A label that would overlap
 * an already placed one collapses to a small coloured dot; zooming in brings it back.
 */
function declutterMarkers(map: MlMap, list: { marker: Marker; el: HTMLElement; item: RankedStation }[]) {
  const order = [...list].sort(
    (a, b) =>
      Number(b.item.isCheapest) - Number(a.item.isCheapest) ||
      Number(b.item.station.isOpen) - Number(a.item.station.isOpen) ||
      a.item.price - b.item.price,
  );
  const placed: { x1: number; x2: number; y1: number; y2: number }[] = [];
  for (const { marker, el, item } of order) {
    const p = map.project(marker.getLngLat());
    const w = item.isCheapest ? 84 : 66;
    const h = item.isCheapest ? 52 : 30;
    const box = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y - h - 4, y2: p.y - 4 };
    const overlaps = placed.some((b) => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1);
    el.classList.toggle("tp-dot", overlaps);
    if (!overlaps) placed.push(box);
  }
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function MapView({ result, origin, radiusKm, dark, onSelect, onShowList }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<{ marker: Marker; el: HTMLElement; item: RankedStation }[]>([]);
  const userMarker = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(() => typeof window !== "undefined" && !webglSupported());
  const [styleReady, setStyleReady] = useState(0);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

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
    const declutter = () => declutterMarkers(map, markers.current);
    map.on("moveend", declutter);
    map.on("style.load", () => setStyleReady((n) => n + 1));
    map.on("error", (e) => {
      if (!map.isStyleLoaded() && (e.error as { status?: number })?.status !== undefined) setFailed(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markers.current = [];
      userMarker.current = null;
      map.off("moveend", declutter);
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
    map.fitBounds(boundsFor(origin, radiusKm), { padding: 24, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400 });
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
      const el = markerElement(item, () => selectRef.current(item.station));
      el.style.zIndex = String(item.isCheapest ? 1000 : i);
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -4] })
        .setLngLat([item.station.lng, item.station.lat])
        .addTo(map);
      return { marker, el, item };
    });
    declutterMarkers(map, markers.current);
  }, [result, failed]);

  if (failed) {
    return (
      <StatusMessage
        icon={<MapIcon size={22} />}
        title="지도를 불러오지 못했어요"
        description="네트워크 상태를 확인하거나 목록으로 가격을 확인하세요."
        actions={<Button onClick={onShowList}>목록으로 보기</Button>}
      />
    );
  }

  const cheapest = result?.cheapest;

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="region" aria-label="주유소 가격 지도" />
      {cheapest && (
        <button
          type="button"
          onClick={() => onSelect(cheapest.station)}
          className="absolute top-3 left-3 flex items-center gap-2.5 rounded-[12px] bg-board px-3 py-2 text-left text-board-ink shadow-[0_4px_14px_rgb(0_0_0/0.25)] ring-1 ring-board-line"
        >
          <span className="text-[12px] text-board-ink-2">최저</span>
          <Price price={cheapest.price} className="text-[20px] font-bold" label="최저가" />
          <span className="max-w-[120px] truncate text-[14px] font-semibold" lang="de">
            {stationTitle(cheapest.station)}
          </span>
        </button>
      )}
      <div
        className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full bg-surface/95 px-3 py-1.5 text-[12px] font-semibold shadow-[0_2px_8px_rgb(0_0_0/0.15)]"
      >
        <span className="flex items-center gap-1 text-low">
          <span className="size-2.5 rounded-full bg-low" aria-hidden="true" />
          저렴
        </span>
        <span className="flex items-center gap-1 text-mid">
          <span className="size-2.5 rounded-full bg-mid" aria-hidden="true" />
          보통
        </span>
        <span className="flex items-center gap-1 text-high">
          <span className="size-2.5 rounded-full bg-high" aria-hidden="true" />
          비쌈
        </span>
      </div>
    </div>
  );
}
