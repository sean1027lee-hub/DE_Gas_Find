"use client";
/**
 * Accessible bottom sheet: modal dialog semantics, focus trap, Esc / backdrop / drag
 * to close, focus restore, safe-area aware. Motion respects prefers-reduced-motion.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Visually hide the title (still announced). */
  hideTitle?: boolean;
  children: ReactNode;
  /** Sticky area at the bottom (primary actions in the thumb zone). */
  footer?: ReactNode;
  labelledBy?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BottomSheet({ open, onClose, title, hideTitle, children, footer }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the panel itself so the first action isn't triggered by accident.
    panel?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return e.preventDefault();
        const first = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, e.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (drag > 90) onClose();
    setDrag(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade-in absolute inset-0 bg-[var(--scrim)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-in relative flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[22px] bg-surface shadow-[var(--shadow-sheet)] outline-none"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? "none" : "transform 200ms ease-out" }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-surface-3" />
        </div>
        <div className="flex shrink-0 items-start gap-3 px-5 pb-2">
          <h2 id={titleId} className={hideTitle ? "sr-only" : "min-w-0 flex-1 text-lg leading-snug font-bold"}>
            {title}
          </h2>
          {hideTitle && <div className="flex-1" />}
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            aria-label="닫기"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>
        )}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>,
    document.body,
  );
}
