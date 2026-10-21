import type { ReactNode } from "react";

interface StatusMessageProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

/** Empty and error states: what happened + what to do next. */
export function StatusMessage({ title, description, icon, actions }: StatusMessageProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center" role="status">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-ink-2">{icon}</div>}
      <p className="text-[17px] font-semibold">{title}</p>
      {description && <p className="mt-1.5 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      {actions && <div className="mt-5 flex w-full max-w-xs flex-col gap-2">{actions}</div>}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <li className="flex min-h-[76px] items-center gap-3 py-3 pr-4 pl-3" aria-hidden="true">
      <span className="skeleton h-12 w-1" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="skeleton h-4 w-40" />
        <span className="skeleton h-3 w-20" />
      </span>
      <span className="skeleton h-7 w-20" />
    </li>
  );
}
