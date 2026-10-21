import type { PriceTier } from "@/lib/pricing";

/** Shape per tier so price bands never rely on colour alone: ▼ cheap · ━ average · ▲ pricey. */
export const TIER_PATHS: Record<PriceTier, string> = {
  low: "M6 10 1.5 4h9z",
  mid: "M1.5 4.5h9v3h-9z",
  high: "M6 2 10.5 8h-9z",
};

export function TierIcon({ tier, size = 12, className = "" }: { tier: PriceTier; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false" className={className}>
      <path d={TIER_PATHS[tier]} fill="currentColor" />
    </svg>
  );
}

/** Same shape as an inline SVG string, for map markers built outside React. */
export function tierIconSvg(tier: PriceTier, size = 11): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="${TIER_PATHS[tier]}" fill="currentColor"/></svg>`;
}

const BADGE: Record<PriceTier, string> = {
  low: "bg-low-soft text-low",
  mid: "bg-mid-soft text-mid",
  high: "bg-high-soft text-high",
};

/** Soft badge: tier shape + text (e.g. "최저", "+2ct"). */
export function TierBadge({ tier, children, className = "" }: { tier: PriceTier; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md py-0.5 pr-1.5 pl-1 text-xs leading-tight font-bold whitespace-nowrap ${BADGE[tier]} ${className}`}
    >
      <TierIcon tier={tier} size={11} />
      {children}
    </span>
  );
}
