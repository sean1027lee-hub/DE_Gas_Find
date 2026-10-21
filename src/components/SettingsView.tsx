"use client";
import { useState, type ReactNode } from "react";
import { BRAND_GROUP_LABELS } from "@/lib/brands";
import { formatCt } from "@/lib/format";
import { NAV_APP_LABELS, type NavApp } from "@/lib/nav";
import { resetAll, updateSettings, type Place, type Settings, type Theme } from "@/lib/store";
import { FUEL_LABELS, FUELS, FUEL_SHORT_LABELS } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { ChevronRightIcon, HomeIcon } from "./icons";
import { PlaceSearch } from "./PlaceSearch";
import { Segmented } from "./Segmented";
import { Stepper } from "./Stepper";
import { Toggle } from "./Toggle";

interface SettingsViewProps {
  settings: Settings;
  currentPosition: Place | null;
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="px-4 pb-2 text-[14px] font-semibold text-ink-2">{title}</h2>
      <div className="mx-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{children}</div>
      {note && <p className="px-4 pt-2 text-[13px] leading-relaxed text-ink-3">{note}</p>}
    </section>
  );
}

function Row({ label, children, sub }: { label: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[16px]">{label}</div>
        {sub && <div className="text-[13px] text-ink-2">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsView({ settings, currentPosition }: SettingsViewProps) {
  const [homeOpen, setHomeOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { discount } = settings;
  const setDiscount = (patch: Partial<Settings["discount"]>) => updateSettings({ discount: { ...discount, ...patch } });

  return (
    <div className="pb-4">
      <Section title="기본 연료">
        <div className="p-3">
          <Segmented
            label="기본 연료"
            value={settings.fuel}
            onChange={(v) => updateSettings({ fuel: v })}
            options={FUELS.map((f) => ({ value: f, label: <span lang="de">{FUEL_SHORT_LABELS[f]}</span>, ariaLabel: FUEL_LABELS[f] }))}
          />
        </div>
      </Section>

      <Section title="집 위치" note="위치 권한이 없을 때와 ‘집’ 기준 보기에 쓰여요.">
        <button
          type="button"
          onClick={() => setHomeOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
        >
          <HomeIcon size={20} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-[16px]" lang="de">
            {settings.home.label}
          </span>
          <span className="text-[14px] text-ink-2">변경</span>
          <ChevronRightIcon size={18} className="text-ink-3" />
        </button>
      </Section>

      <Section
        title="Fleet Card 할인"
        note="할인은 주유기 가격에서 빠지지 않고 월 청구서에서 차감되는 것으로 보여요. 앱은 ‘카드 적용 예상가’로 비교해요."
      >
        <Row label="할인 적용해서 비교">
          <Toggle checked={discount.enabled} onChange={(v) => setDiscount({ enabled: v })} label="카드 할인 적용" />
        </Row>
        <Row label={<span lang="de">{BRAND_GROUP_LABELS.total}</span>} sub="리터당">
          <Stepper
            label="TotalEnergies 할인"
            value={discount.totalCt}
            onChange={(v) => setDiscount({ totalCt: v })}
            min={0}
            max={15}
            step={0.5}
            format={(v) => formatCt(v / 100)}
            disabled={!discount.enabled}
          />
        </Row>
        <Row label={<span lang="de">{BRAND_GROUP_LABELS.partner}</span>} sub="리터당">
          <Stepper
            label="제휴 주유소 할인"
            value={discount.partnerCt}
            onChange={(v) => setDiscount({ partnerCt: v })}
            min={0}
            max={15}
            step={0.5}
            format={(v) => formatCt(v / 100)}
            disabled={!discount.enabled}
          />
        </Row>
      </Section>

      <Section title="절약액 계산 기준" note="요약 카드의 “50L 주유 시 절약” 같은 계산에 쓰여요.">
        <Row label="한 번 주유량">
          <Stepper
            label="주유량"
            value={settings.litres}
            onChange={(v) => updateSettings({ litres: v })}
            min={10}
            max={120}
            step={5}
            format={(v) => `${v} L`}
          />
        </Row>
      </Section>

      <Section title="길안내 앱">
        <div className="p-3">
          <Segmented<NavApp>
            label="길안내 앱"
            value={settings.navApp}
            onChange={(v) => updateSettings({ navApp: v })}
            options={(["apple", "google"] as NavApp[]).map((a) => ({ value: a, label: NAV_APP_LABELS[a] }))}
          />
        </div>
      </Section>

      <Section title="화면 테마">
        <div className="p-3">
          <Segmented<Theme>
            label="화면 테마"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "system", label: "시스템" },
              { value: "light", label: "라이트" },
              { value: "dark", label: "다크" },
            ]}
          />
        </div>
      </Section>

      <Section title="홈 화면에 추가">
        <div className="px-4 py-3.5 text-[15px] leading-relaxed text-ink-2">
          Safari에서 <strong className="font-semibold text-ink">공유 버튼</strong> →{" "}
          <strong className="font-semibold text-ink">홈 화면에 추가</strong>를 누르면 앱처럼 바로 열 수 있어요.
        </div>
      </Section>

      <Section title="정보">
        <div className="px-4 py-3.5 text-[14px] leading-relaxed text-ink-2">
          <p>
            가격 데이터:{" "}
            <a className="text-accent underline underline-offset-2" href="https://creativecommons.tankerkoenig.de" target="_blank" rel="noopener">
              Tankerkönig
            </a>{" "}
            / MTS-K (CC BY 4.0). 주유소가 신고한 가격으로, 실제 주유기 가격과 잠시 다를 수 있어요.
          </p>
          <p className="mt-2">
            지도: © OpenFreeMap © OpenMapTiles © OpenStreetMap 기여자. 위치 검색: Nominatim (OpenStreetMap).
          </p>
        </div>
        <div className="p-3">
          <Button variant="secondary" className="w-full !text-high" onClick={() => setConfirmReset(true)}>
            저장된 설정·즐겨찾기 지우기
          </Button>
        </div>
      </Section>

      <BottomSheet open={homeOpen} onClose={() => setHomeOpen(false)} title="집 위치 바꾸기">
        {currentPosition && (
          <Button
            variant="secondary"
            className="mb-4 w-full"
            onClick={() => {
              updateSettings({ home: { ...currentPosition, label: currentPosition.label === "현재 위치" ? "집" : currentPosition.label } });
              setHomeOpen(false);
            }}
          >
            지금 위치를 집으로 설정
          </Button>
        )}
        <PlaceSearch
          autoFocus
          onPick={(p) => {
            updateSettings({ home: p });
            setHomeOpen(false);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="저장된 데이터를 모두 지울까요?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>
              취소
            </Button>
            <Button
              className="flex-1 !bg-high !text-white"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                window.location.reload();
              }}
            >
              모두 지우기
            </Button>
          </div>
        }
      >
        <p className="text-[15px] leading-relaxed text-ink-2">설정, 즐겨찾기, 마지막 가격 기록이 이 기기에서 삭제돼요.</p>
      </BottomSheet>
    </div>
  );
}
