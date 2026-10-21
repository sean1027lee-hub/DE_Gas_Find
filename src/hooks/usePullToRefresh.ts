"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

const THRESHOLD = 72;
const MAX_PULL = 110;

/**
 * Pull-to-refresh on the document scroller (iOS standalone web apps have none).
 * Touch listeners attach to `ref`; the gesture only starts at the very top.
 */
export function usePullToRefresh(ref: RefObject<HTMLElement | null>, onRefresh: () => Promise<unknown>, enabled = true) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const callback = useRef(onRefresh);
  useEffect(() => {
    callback.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const atTop = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;

    const onStart = (e: TouchEvent) => {
      const inSheet = (e.target as HTMLElement).closest?.('[role="dialog"]');
      start.current = !inSheet && atTop() && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || !atTop()) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // Rubber band: resistance grows with distance.
      const distance = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = distance;
      setPull(distance);
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = async () => {
      const distance = pullRef.current;
      start.current = null;
      pullRef.current = 0;
      if (distance < THRESHOLD) {
        setPull(0);
        return;
      }
      setRefreshing(true);
      setPull(THRESHOLD * 0.7);
      try {
        await callback.current();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled]);

  return { pull, refreshing, ready: pull >= THRESHOLD };
}
