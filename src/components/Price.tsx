import { priceParts, priceString } from "@/lib/format";

interface PriceProps {
  price: number;
  className?: string;
  /** Prefix for the accessible text, e.g. "카드 적용 예상가". */
  label?: string;
}

/** Pump-style price: "1,73⁹". Screen readers hear "1,739 유로". */
export function Price({ price, className = "", label }: PriceProps) {
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
      <span className="sr-only">{`${label ? `${label} ` : ""}${priceString(price)} 유로`}</span>
    </span>
  );
}
