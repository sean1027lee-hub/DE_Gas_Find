"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { priceParts, priceString } from "@/lib/format";

interface PriceProps {
  price: number;
  className?: string;
  /** Prefix for the screen-reader text, e.g. "최저가". */
  label?: string;
}

/** Pump-style price: "1,73⁹". Screen readers hear "1,739 유로". */
export function Price({ price, className = "", label }: PriceProps) {
  const { t } = useT();
  const { main, sup } = priceParts(price);
  const [euros, cents] = main.split(",");
  return (
    <span className={`num whitespace-nowrap ${className}`}>
      <span aria-hidden="true">
        {euros}
        <span className="price-comma">,</span>
        {cents}
        <span className="price-sup">{sup}</span>
      </span>
      <span className="sr-only">{`${label ? `${label} ` : ""}${t("common.priceSr", { price: priceString(price) })}`}</span>
    </span>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Price that counts from its previous value to the new one (400 ms, ease-out)
 * when data refreshes — Toss-style. Instant with reduced motion. Only the visual
 * digits animate; the screen-reader text is always the final value.
 */
export function AnimatedPrice(props: PriceProps) {
  const { t } = useT();
  const [shown, setShown] = useState(props.price);
  const from = useRef(props.price);

  useEffect(() => {
    const target = props.price;
    const start = from.current;
    from.current = target;
    if (start === target || prefersReducedMotion()) {
      setShown(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 400);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round((start + (target - start) * eased) * 1000) / 1000);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [props.price]);

  return (
    <span className="relative">
      <span aria-hidden="true">
        <Price {...props} price={shown} />
      </span>
      <span className="sr-only">
        {`${props.label ? `${props.label} ` : ""}${t("common.priceSr", { price: priceString(props.price) })}`}
      </span>
    </span>
  );
}
