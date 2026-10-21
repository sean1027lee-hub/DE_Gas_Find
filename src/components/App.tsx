"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useBenchmarks } from "@/hooks/useBenchmarks";
import { useHydrated, useMediaQuery, useNow, useOnline } from "@/hooks/useClientState";
import { useNearby } from "@/hooks/useNearby";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { SsrLangContext, useT, type Lang, type MessageKey } from "@/i18n";
import { benchmarkFuel, type BenchmarkFuel } from "@/lib/benchmarks";
import { formatClock } from "@/lib/format";
import { snapToGrid } from "@/lib/geo";
import { rankStations } from "@/lib/pricing";
import { scenario, scenarioClock } from "@/lib/scenario";
import { favoritesStore, observationsStore, settingsStore, toggleFavorite, updateSettings } from "@/lib/store";
import { addObservation, berlinClock, learnCurve, typicalOffsetCt } from "@/lib/timing";
import { FUEL_LABELS, FUELS, type Station } from "@/lib/types";
import { Attribution } from "./Attribution";
import { Banner, BannerAction } from "./Banner";
import { Button } from "./Button";
import { ControlDock } from "./ControlDock";
import { FavoritesView } from "./FavoritesView";
import { Header } from "./Header";
import { RefreshIcon } from "./icons";
import { LocationSheet } from "./LocationSheet";
import { MarketInsight } from "./MarketInsight";
import { NearbyList } from "./NearbyList";
import { Onboarding } from "./Onboarding";
import { SettingsView } from "./SettingsView";
import { StationSheet } from "./StationSheet";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { HeroCard, SummarySkeleton } from "./SummaryCard";
import { TabBar, type Tab } from "./TabBar";
import { TimingCard, TimingSheet, type TimingModel } from "./Timing";

const CompareView = dynamic(() => import("./CompareView").then((m) => m.CompareView), {
  ssr: false,
  loading: () => <div className="skeleton mx-4 h-64" />,
});

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" />,
});

/** Prices older than this are dimmed and the refresh control is highlighted. */
const STALE_MS = 10 * 60_000;
/** Radius used to record "cheapest nearby" observations for the timing forecast. */
const OBSERVE_RADIUS_KM = 5;

function useTheme(theme: "system" | "light" | "dark") {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }, [dark]);
  return dark;
}

/** Expose header/dock heights as CSS variables so the map can fill the space between. */
function useMeasuredVar(name: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty(name, `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return ref;
}

const cellOf = (p: { lat: number; lng: number }) => {
  const g = snapToGrid(p);
  return `${g.lat.toFixed(2)},${g.lng.toFixed(2)}`;
};

/** Entry point: provides the language the server rendered with (see proxy.ts). */
export function App({ ssrLang }: { ssrLang: Lang }) {
  return (
    <SsrLangContext.Provider value={ssrLang}>
      <AppInner />
    </SsrLangContext.Provider>
  );
}

function AppInner() {
  const { t } = useT();
  const hydrated = useHydrated();
  const settings = settingsStore.use();
  const favorites = favoritesStore.use();
  const observations = observationsStore.use();
  const dark = useTheme(settings.theme);
  const online = useOnline();
  const now = useNow();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const nearby = useNearby(hydrated && settings.onboarded);
  const [tab, setTab] = useState<Tab>("nearby");
  const [selected, setSelected] = useState<{ station: Station; fetchedAt: string | null } | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const benchmarks = useBenchmarks();
  const [compareFuel, setCompareFuel] = useState<BenchmarkFuel | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useMeasuredVar("--header-h");
  const dockRef = useMeasuredVar("--dock-h");

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.station.id)), [favorites]);
  const { data, effectiveOrigin } = nearby;

  const result = useMemo(() => {
    if (!data || !effectiveOrigin) return null;
    return rankStations(data.stations, {
      fuel: settings.fuel,
      origin: effectiveOrigin,
      radiusKm: settings.radiusKm,
      sort: settings.sort,
    });
  }, [data, effectiveOrigin, settings.fuel, settings.radiusKm, settings.sort]);

  // Remember the cheapest nearby price per fuel (live data only) to learn the local daily pattern.
  useEffect(() => {
    if (!data || data.source !== "live" || scenario() || !effectiveOrigin) return;
    const cell = cellOf(effectiveOrigin);
    const time = Date.parse(data.fetchedAt);
    for (const fuel of FUELS) {
      const r = rankStations(data.stations, { fuel, origin: effectiveOrigin, radiusKm: OBSERVE_RADIUS_KM, sort: "price" });
      if (r.cheapest) {
        const price = r.cheapest.price;
        observationsStore.set((list) => addObservation(list, { t: time, fuel, price, cell }));
      }
    }
  }, [data, effectiveOrigin]);

  const timing: TimingModel | null = useMemo(() => {
    if (!result?.cheapest || !effectiveOrigin) return null;
    const override = scenarioClock();
    const clock = override
      ? { hour: Number(override.split(":")[0]), minute: Number(override.split(":")[1]) }
      : berlinClock(now);
    const cell = cellOf(effectiveOrigin);
    const learned =
      data?.source === "live" ? learnCurve(observations.filter((o) => o.cell === cell), settings.fuel) : null;
    const fuel = settings.fuel;
    return {
      nowPrice: result.cheapest.price,
      nowHour: clock.hour + clock.minute / 60,
      curve: learned?.curve ?? ((h: number) => typicalOffsetCt(h, fuel)),
      learnedDays: learned?.days ?? null,
    };
  }, [result, effectiveOrigin, now, observations, data, settings.fuel]);

  const fetchedAt = data ? new Date(data.fetchedAt) : null;
  const stale = !!fetchedAt && now.getTime() - fetchedAt.getTime() > STALE_MS;
  const busy = nearby.status === "loading" || nearby.status === "refreshing";

  const { refresh } = nearby;
  const doRefresh = useCallback(async () => {
    await refresh();
    setAnnouncement(t("announce.refreshed", { time: formatClock(new Date()) }));
  }, [refresh, t]);

  const pull = usePullToRefresh(mainRef, doRefresh, !desktop && tab === "nearby" && settings.view === "list");

  const openStation = useCallback(
    (station: Station, at: string | null = data?.fetchedAt ?? null) => setSelected({ station, fetchedAt: at }),
    [data],
  );

  // Keep the open sheet in sync with fresher data for the same station.
  const selectedStation = useMemo(() => {
    if (!selected) return null;
    return data?.stations.find((s) => s.id === selected.station.id) ?? selected.station;
  }, [selected, data]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  if (!hydrated) {
    // Server render + hydration: first-time visitors see the real onboarding screen
    // immediately; returning visitors (flagged by the boot script) see the app skeleton.
    return (
      <>
        <div className="tp-boot">
          <BootSkeleton />
        </div>
        <div className="tp-onboarding">
          <Onboarding
            settings={settings}
            locating={false}
            locError={null}
            onLocate={nearby.locate}
            onHome={nearby.selectHome}
            onPlace={nearby.selectPlace}
          />
        </div>
      </>
    );
  }

  if (!settings.onboarded) {
    return (
      <Onboarding
        settings={settings}
        locating={nearby.locating}
        locError={nearby.locError}
        onLocate={nearby.locate}
        onHome={nearby.selectHome}
        onPlace={nearby.selectPlace}
      />
    );
  }

  const origin = nearby.origin;
  // "" (or a label stored by older versions) means a GPS fix without a place name yet.
  const gpsUnnamed = origin?.mode === "gps" && (!origin.label || origin.label === "현재 위치");
  const locationLabel = gpsUnnamed
    ? t("loc.current")
    : origin?.mode === "gps"
      ? t("header.near", { place: origin.label })
      : (origin?.label ?? nearby.dataOrigin?.label ?? t("header.pickLocation"));
  const split = desktop && tab === "nearby";
  const isMap = !split && tab === "nearby" && settings.view === "map";
  const offline = !online;
  const errorText = nearby.error ? t(`error.code.${nearby.error.code}` as MessageKey) : "";

  const banners = (
    <div className="space-y-2 px-4 empty:hidden [&:not(:empty)]:mb-3">
      {data?.source === "mock" && (
        <Banner tone="warn">
          <strong className="font-semibold">{t("banner.mock")}</strong>
        </Banner>
      )}
      {offline && data && fetchedAt && <Banner tone="warn">{t("banner.offline", { time: formatClock(fetchedAt) })}</Banner>}
      {!offline && nearby.status === "error" && data && (
        <Banner tone="warn" action={<BannerAction onClick={doRefresh}>{t("common.retry")}</BannerAction>}>
          {t("banner.refreshFailed", { reason: errorText })}
        </Banner>
      )}
      {nearby.locError === "denied" && origin?.mode !== "place" && (
        <Banner action={<BannerAction onClick={() => setLocationOpen(true)}>{t("common.change")}</BannerAction>}>
          {t("banner.denied", { place: origin?.label || settings.home.label })}
        </Banner>
      )}
      {!nearby.locError && nearby.stalePosition && !nearby.locating && (
        <Banner action={<BannerAction onClick={() => void nearby.locate()}>{t("loc.current")}</BannerAction>}>
          {t("banner.stalePos")}
        </Banner>
      )}
    </div>
  );

  const mapView = (
    <MapView
      result={result}
      origin={effectiveOrigin}
      radiusKm={settings.radiusKm}
      dark={dark}
      navApp={settings.navApp}
      onSelect={(s) => openStation(s)}
      onShowList={() => updateSettings({ view: "list" })}
    />
  );

  const listTop = result?.cheapest && (
    <>
      <HeroCard
        cheapest={result.cheapest}
        average={result.average}
        count={result.open.length}
        fuel={settings.fuel}
        radiusKm={settings.radiusKm}
        litres={settings.litres}
        stale={stale}
        navApp={settings.navApp}
        onSelect={() => openStation(result.cheapest!.station)}
      />
      {timing && <TimingCard model={timing} onOpen={() => setTimingOpen(true)} />}
      {benchmarks && (
        <MarketInsight
          data={benchmarks}
          fuel={settings.fuel}
          localCheapest={result.cheapest.price}
          onOpen={() => {
            setCompareFuel(null);
            setTab("compare");
          }}
        />
      )}
    </>
  );

  let content: React.ReactNode;
  if (tab === "compare") {
    content = (
      <CompareView
        data={benchmarks}
        fuel={compareFuel ?? benchmarkFuel(settings.fuel)}
        onFuelChange={setCompareFuel}
        litres={settings.litres}
      />
    );
  } else if (tab === "favorites") {
    content = <FavoritesView fuel={settings.fuel} origin={effectiveOrigin} now={now} onSelect={(s, at) => openStation(s, at)} />;
  } else if (tab === "settings") {
    content = <SettingsView settings={settings} currentPosition={origin?.mode === "gps" ? origin : null} />;
  } else if (!data && nearby.status === "error") {
    const isOffline = nearby.error?.code === "offline";
    content = (
      <StatusMessage
        icon={<RefreshIcon size={22} />}
        title={t(isOffline ? "error.offlineTitle" : "error.title")}
        description={isOffline ? t("error.offlineDesc") : `${errorText} ${t("error.later")}`}
        actions={<Button onClick={doRefresh}>{t("common.retry")}</Button>}
      />
    );
  } else if (isMap) {
    content = mapView;
  } else {
    content = (
      <NearbyList
        result={result}
        loading={nearby.status === "loading" && !!data}
        fuel={settings.fuel}
        radiusKm={settings.radiusKm}
        sort={settings.sort}
        favoriteIds={favoriteIds}
        onSelect={(s) => openStation(s)}
        top={listTop}
      />
    );
  }

  const tabTitle: MessageKey | null =
    tab === "compare" ? "title.compare" : tab === "favorites" ? "title.favorites" : tab === "settings" ? "title.settings" : null;
  // Desktop: list + map side by side on "nearby"; the comparison gets a wider two-column page.
  const column = split ? "w-[440px]" : tab === "compare" ? "mx-auto w-full max-w-[560px] lg:max-w-[960px]" : "mx-auto w-full max-w-[560px]";

  const page = (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        {t("common.skip")}
      </a>
      <header
        ref={headerRef}
        className={`pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-bg ${column}`}
      >
        {tabTitle ? (
          <div className="flex min-h-14 items-center px-5">
            <h1 className="text-xl font-bold">{t(tabTitle)}</h1>
          </div>
        ) : (
          <>
            <h1 className="sr-only">{t("title.nearby")}</h1>
            <Header
              locationLabel={locationLabel}
              locationMode={origin?.mode ?? null}
              locating={nearby.locating}
              onLocationClick={() => setLocationOpen(true)}
              fetchedAt={fetchedAt}
              now={now}
              refreshing={busy}
              stale={stale}
              offline={offline}
              onRefresh={doRefresh}
            />
          </>
        )}
      </header>

      <main
        id="main"
        ref={mainRef}
        className={
          isMap
            ? "fixed inset-x-0 z-0 mx-auto flex max-w-[560px] flex-col top-[var(--header-h,56px)] bottom-[var(--dock-h,160px)]"
            : `${column} pb-[calc(var(--dock-h,160px)+8px)]`
        }
      >
        {!isMap && (
          <div
            className="flex items-end justify-center overflow-hidden text-ink-2"
            style={{ height: pull.pull, transition: pull.pull ? "none" : "height 200ms ease-out" }}
            aria-hidden="true"
          >
            <RefreshIcon
              size={22}
              className={`mb-2 ${pull.refreshing ? "animate-spin-slow" : ""}`}
              style={{ transform: pull.refreshing ? undefined : `rotate(${pull.pull * 3}deg)`, opacity: Math.min(1, pull.pull / 60) }}
            />
          </div>
        )}
        {tab === "nearby" && !isMap && <div className="pt-1">{banners}</div>}
        {isMap && <div className="shrink-0 pt-1 empty:hidden">{banners}</div>}
        <div className={isMap ? "min-h-0 flex-1" : "pt-1"}>{content}</div>
        {!isMap && <Attribution />}
      </main>

      <div
        ref={dockRef}
        className={`fixed bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md ${
          split ? "left-0 w-[440px]" : `inset-x-0 mx-auto ${tab === "compare" ? "max-w-[560px] lg:max-w-[960px]" : "max-w-[560px]"}`
        }`}
      >
        {tab === "nearby" && (
          <ControlDock fuel={settings.fuel} radiusKm={settings.radiusKm} view={settings.view} showViewToggle={!split} />
        )}
        <TabBar tab={tab} onChange={setTab} favoriteCount={favorites.length} />
      </div>
    </>
  );

  return (
    <>
      {split ? (
        <div className="grid min-h-dvh grid-cols-[440px_minmax(0,1fr)]">
          <div className="min-w-0 border-r border-line">{page}</div>
          <aside className="sticky top-0 h-dvh" aria-label={t("map.region")}>
            {mapView}
          </aside>
        </div>
      ) : (
        page
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <LocationSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        home={settings.home}
        locating={nearby.locating}
        locError={nearby.locError}
        onLocate={nearby.locate}
        onHome={nearby.selectHome}
        onPlace={nearby.selectPlace}
      />

      {timingOpen && timing && (
        <TimingSheet model={timing} litres={settings.litres} fuelLabel={FUEL_LABELS[settings.fuel]} onClose={() => setTimingOpen(false)} />
      )}

      {selectedStation && (
        <StationSheet
          station={selectedStation}
          fuel={settings.fuel}
          origin={effectiveOrigin}
          fetchedAt={selected?.fetchedAt ?? null}
          navApp={settings.navApp}
          favorite={favoriteIds.has(selectedStation.id)}
          onToggleFavorite={toggleFavorite}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function BootSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[560px]" aria-busy="true">
      <div className="pt-safe">
        <div className="flex h-14 items-center px-5">
          <span className="skeleton h-5 w-36" />
        </div>
      </div>
      <div className="px-4 pt-2">
        <SummarySkeleton />
      </div>
      <ul className="mx-4 mt-6 overflow-hidden rounded-[var(--radius-card)] bg-surface">
        {Array.from({ length: 4 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}
