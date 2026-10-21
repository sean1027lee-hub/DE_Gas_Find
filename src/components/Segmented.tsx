"use client";
import { useRef, type ReactNode } from "react";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "sm";
  variant?: "segmented" | "chips";
  className?: string;
}

/** Radio group with roving focus (arrow keys), rendered as segmented control or chips. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "md",
  variant = "segmented",
  className = "",
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const height = size === "md" ? "min-h-11" : "min-h-9";

  if (variant === "chips") {
    return (
      <div role="radiogroup" aria-label={label} className={`flex gap-1.5 ${className}`}>
        {options.map((o, i) => {
          const checked = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={o.ariaLabel}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`${height} shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                checked ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 active:bg-surface-3"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-0.5 rounded-[12px] bg-surface-2 p-1 ${className}`}>
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.ariaLabel}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`${height} flex min-w-fit flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2.5 text-ui font-semibold transition-colors ${
              checked ? "bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
