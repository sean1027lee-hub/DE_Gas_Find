"use client";

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  format: (v: number) => string;
  disabled?: boolean;
}

/** −/+ control with spinbutton semantics. */
export function Stepper({ value, onChange, min, max, step, label, decreaseLabel, increaseLabel, format, disabled }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  const btn =
    "grid size-11 place-items-center rounded-full bg-surface-2 text-xl font-semibold text-ink active:bg-surface-3 disabled:opacity-40";
  return (
    <div className={`flex items-center gap-2 ${disabled ? "opacity-50" : ""}`}>
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={disabled || value <= min} aria-label={decreaseLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
      <span
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={format(value)}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            set(value + step);
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            set(value - step);
          }
        }}
        className="tnum min-w-[4rem] text-center text-title font-semibold"
      >
        {format(value)}
      </span>
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={disabled || value >= max} aria-label={increaseLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
