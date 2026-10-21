import type { ReactNode } from "react";

type Tone = "warn" | "info";

export function Banner({ tone = "info", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const toneClass = tone === "warn" ? "bg-warn-soft text-warn-ink" : "bg-surface-2 text-ink-2";
  return (
    <div className={`flex min-h-11 items-center gap-3 rounded-[12px] px-3.5 py-2 text-[14px] ${toneClass}`} role="status">
      <div className="min-w-0 flex-1 leading-snug">{children}</div>
      {action}
    </div>
  );
}

export function BannerAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="-my-1 min-h-11 shrink-0 px-1 font-semibold underline underline-offset-4">
      {children}
    </button>
  );
}
