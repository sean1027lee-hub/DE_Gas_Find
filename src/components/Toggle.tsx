"use client";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface-3"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.2)] transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
