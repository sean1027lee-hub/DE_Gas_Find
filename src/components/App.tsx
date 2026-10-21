"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHydrated, useMediaQuery, useNow, useOnline } from "@/hooks/useClientState";
import { GPS_LABEL, useNearby } from "@/hooks/useNearby";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { formatClock } from "@/lib/format";
import { rankStations } from "@/lib/pricing";
import { favoritesStore, settingsStore, toggleFavorite, updateSettings } from "@/lib/store";
import type { Station } from "@/lib/types";
import { Attribution } from "./Attribution";
import { Banner, BannerAction } from "./Banner";
import { Button } from "./Button";
import { ControlDock } from "./ControlDock";
import { FavoritesView } from "./FavoritesView";
import { Header } from "./Header";
import { LocationSheet } from "./LocationSheet";
import { NearbyList } from "./NearbyList";
import { Onboarding } from "./Onboarding";
import { RefreshIcon } from "./icons";
import { SettingsView } from "./SettingsView";
import { StationSheet } from "./StationSheet";
import { RowSkeleton, StatusMessage } from "./StatusMessage";
import { SummarySkeleton } from "./SummaryCard";
import { TabBar, type Tab } from "./TabBar";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" aria-label="지도 불러오는 중" />,
});

/** Prices older than this are dimmed and the refresh control is highlighted. */
const STALE_MS = 10 * 60_000;

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

export function App() {
  const hydrated = useHydrated();
  const settings = settingsStore.use();
  const favorites = favoritesStore.use();
  const dark = useTheme(settings.theme);
  const online = useOnline();
  const now = useNow();
  const nearby = useNearby(hydrated && settings.onboarded);
  const [tab, setTab] = useState<Tab>("nearby");
  const [selected, setSelected] = useState<{ station: Station; fetchedAt: string | null } | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
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
      rules: settings.discount,
      origin: effectiveOrigin,
      radiusKm: settings.radiusKm,
      sort: settings.sort,
    });
  }, [data, effectiveOrigin, settings.fuel, settings.discount, settings.radiusKm, settings.sort]);

  const fetchedAt = data ? new Date(data.fetchedAt) : null;
  const stale = !!fetchedAt && now.getTime() - fetchedAt.getTime() > STALE_MS;
  const busy = nearby.status === "loading" || nearby.status === "refreshing";

  const { refresh } = nearby;
  const doRefresh = useCallback(async () => {
    await refresh();
    setAnnouncement(`가격을 새로 불러왔어요 · ${formatClock(new Date())}`);
  }, [refresh]);

  const pull = usePullToRefresh(mainRef, doRefresh, tab === "nearby" && settings.view === "list");

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
  const locationLabel =
    origin?.mode === "gps" && origin.label !== GPS_LABEL
      ? `${origin.label} 근처`
      : (origin?.label ?? nearby.dataOrigin?.label ?? "위치 선택");
  const isMap = tab === "nearby" && settings.view === "map";
  const offline = !online;

  const banners = (
    <div className="space-y-2 px-4 empty:hidden [&:not(:empty)]:mb-3">
      {data?.source === "mock" && (
        <Banner tone="warn">
          <strong className="font-semibold">샘플 데이터</strong> · 실제 가격이 아니에요. 서버에 API 키를 설정하세요.
        </Banner>
      )}
      {offline && data && (
        <Banner tone="warn">오프라인이에요. {fetchedAt && formatClock(fetchedAt)} 기준 마지막 가격을 보여드려요.</Banner>
      )}
      {!offline && nearby.status === "error" && data && (
        <Banner tone="warn" action={<BannerAction onClick={doRefresh}>다시 시도</BannerAction>}>
          {nearby.error?.message} 마지막 가격을 보여드려요.
        </Banner>
      )}
      {nearby.locError === "denied" && origin?.mode !== "place" && (
        <Banner action={<BannerAction onClick={() => setLocationOpen(true)}>변경</BannerAction>}>
          위치 권한이 꺼져 있어 {origin?.label ?? settings.home.label} 기준으로 보여드려요.
        </Banner>
      )}
      {!nearby.locError && nearby.stalePosition && !nearby.locating && (
        <Banner action={<BannerAction onClick={() => void nearby.locate()}>현재 위치</BannerAction>}>
          마지막으로 본 위치 기준이에요.
        </Banner>
      )}
    </div>
  );

  let content: React.ReactNode;
  if (tab === "favorites") {
    content = (
      <FavoritesView
        fuel={settings.fuel}
        rules={settings.discount}
        origin={effectiveOrigin}
        now={now}
        onSelect={(s, at) => openStation(s, at)}
      />
    );
  } else if (tab === "settings") {
    content = <SettingsView settings={settings} currentPosition={origin?.mode === "gps" ? origin : null} />;
  } else if (!data && nearby.status === "error") {
    content = (
      <StatusMessage
        icon={<RefreshIcon size={22} />}
        title={nearby.error?.code === "offline" ? "오프라인이에요" : "가격을 불러오지 못했어요"}
        description={
          nearby.error?.code === "offline"
            ? "인터넷에 연결되면 자동으로 다시 불러올게요."
            : `${nearby.error?.message ?? ""} 잠시 후 다시 시도해 주세요.`
        }
        actions={<Button onClick={doRefresh}>다시 시도</Button>}
      />
    );
  } else if (isMap) {
    content = (
      <MapView
        result={result}
        origin={effectiveOrigin}
        radiusKm={settings.radiusKm}
        dark={dark}
        onSelect={(s) => openStation(s)}
        onShowList={() => updateSettings({ view: "list" })}
      />
    );
  } else {
    content = (
      <NearbyList
        result={result}
        loading={nearby.status === "loading" && !!data}
        fuel={settings.fuel}
        radiusKm={settings.radiusKm}
        sort={settings.sort}
        litres={settings.litres}
        stale={stale}
        favoriteIds={favoriteIds}
        onSelect={(s) => openStation(s)}
      />
    );
  }

  const tabTitle = tab === "favorites" ? "즐겨찾기" : tab === "settings" ? "설정" : null;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        본문으로 건너뛰기
      </a>
      <header
        ref={headerRef}
        className="pt-safe sticky top-0 z-30 mx-auto w-full max-w-[560px] bg-bg/90 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-bg"
      >
        {tabTitle ? (
          <div className="flex h-14 items-center px-5">
            <h1 className="text-[20px] font-bold">{tabTitle}</h1>
          </div>
        ) : (
          <>
            <h1 className="sr-only">내 주변 주유 가격</h1>
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
            : "mx-auto w-full max-w-[560px] pb-[calc(var(--dock-h,160px)+8px)]"
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
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[560px] border-t border-line bg-bg/95 backdrop-blur-md"
      >
        {tab === "nearby" && <ControlDock fuel={settings.fuel} radiusKm={settings.radiusKm} view={settings.view} />}
        <TabBar tab={tab} onChange={setTab} favoriteCount={favorites.length} />
      </div>

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

      {selectedStation && (
        <StationSheet
          station={selectedStation}
          fuel={settings.fuel}
          rules={settings.discount}
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
    <div className="mx-auto w-full max-w-[560px]" aria-busy="true" aria-label="불러오는 중">
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
