import type { LocError } from "@/hooks/useNearby";

export const LOC_ERROR_TEXT: Record<LocError, string> = {
  denied: "위치 권한이 꺼져 있어요.",
  unavailable: "현재 위치를 찾지 못했어요.",
  timeout: "위치를 찾는 데 시간이 너무 오래 걸렸어요.",
  unsupported: "이 브라우저는 위치 기능을 지원하지 않아요.",
};

/** How to re-enable location on iPhone; shown only after a denial. */
export function DeniedHelp() {
  return (
    <p className="text-[13px] leading-relaxed text-ink-2">
      다시 켜려면 iPhone <strong className="font-semibold text-ink">설정 → 개인정보 보호 및 보안 → 위치 서비스</strong>
      에서 Safari 웹 사이트를 ‘앱을 사용하는 동안’으로 바꾼 뒤 새로고침하세요.
    </p>
  );
}
