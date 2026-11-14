import Image from "next/image";
import type { CheckoutTotals } from "../../lib/stripe/checkout-totals";
import type { CartItem } from "../data/cart-store";
import type { Product } from "../data/catalog";
import { getLinePricing } from "../lib/pricing";
import { selectionEntries } from "../lib/product-options";

export type CheckoutRow = {
  item: CartItem;
  product: Product;
};

export function OrderSummary({
  rows,
  itemCount,
  subtotal,
  shippingRate,
  totals,
}: {
  rows: CheckoutRow[];
  itemCount: number;
  subtotal: number;
  totals?: CheckoutTotals | null;
  shippingRate?: { serviceName: string; amountCents: number };
}) {
  const displayedTotal = totals
    ? totals.totalCents / 100
    : subtotal + (shippingRate?.amountCents ?? 0) / 100;
  const summaryContent = (
    <>
      <div className="grid max-h-[360px] gap-5 overflow-y-auto pb-7">
        {rows.map(({ item, product }) => {
          const pricing = getLinePricing(product, item.quantity);
          return (
            <article
              className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 max-sm:grid-cols-[64px_minmax(0,1fr)_auto] max-sm:gap-3"
              key={`${product.id}-${item.size ?? ""}-${item.color ?? ""}-${JSON.stringify(item.options ?? {})}`}
            >
              <span className="relative grid size-[72px] place-items-center overflow-visible rounded-2xl border border-white bg-white shadow-sm max-sm:size-16">
                <Image
                  className="rounded-2xl object-contain"
                  src={product.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 64px, 72px"
                />
                <small
                  className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-semibold leading-none text-white"
                  aria-label={`${item.quantity} boxes`}
                >
                  {item.quantity}
                </small>
              </span>
              <p className="flex min-w-0 flex-col gap-0.5">
                <strong className="line-clamp-2 text-[13px] font-medium leading-5">
                  {product.name}
                </strong>
                <small className="text-[11px] leading-4 text-slate-500">
                  {[
                    item.size,
                    item.color,
                    ...selectionEntries(item.options).map(([name, value]) => `${name}: ${value}`),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {pricing.tier && (
                  <small className="text-[11px] leading-4 text-emerald-700">
                    ${pricing.unitPrice.toFixed(2)}/box · {pricing.tier.discountPercent}% volume
                    savings included
                  </small>
                )}
              </p>
              <strong className="self-center whitespace-nowrap text-right text-[13px] font-medium">
                ${pricing.total.toFixed(2)}
              </strong>
            </article>
          );
        })}
      </div>
      <dl className="grid gap-2 border-t border-slate-200 pt-6 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-3">
        <div>
          <dt>Subtotal</dt>
          <dd>${(totals ? totals.subtotalCents / 100 : subtotal).toFixed(2)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd className="text-right">
            {shippingRate ? (
              `$${((totals?.shippingCents ?? shippingRate.amountCents) / 100).toFixed(2)}`
            ) : (
              <span className="text-slate-500">Enter shipping address</span>
            )}
          </dd>
        </div>
        {shippingRate && (
          <div>
            <dt>Estimated taxes</dt>
            <dd className="text-right">
              {totals ? (
                `$${(totals.taxCents / 100).toFixed(2)}`
              ) : (
                <span className="text-slate-500">Calculated at payment</span>
              )}
            </dd>
          </div>
        )}
        <div
          className="items-baseline pt-4 text-lg font-semibold text-[#172b3a]"
          aria-live="polite"
          aria-atomic="true"
        >
          <dt>{totals ? "Total" : "Estimated total"}</dt>
          <dd className="text-right">
            <span className="mr-2 text-[11px] font-normal text-slate-500">USD</span>$
            {displayedTotal.toFixed(2)}
          </dd>
        </div>
      </dl>
      {!totals && (
        <p className="mt-5 text-[11px] leading-4 text-slate-500">
          {shippingRate
            ? "Estimated total; tax is calculated before payment."
            : "Estimated total; shipping and tax are added before payment."}
        </p>
      )}
    </>
  );

  return (
    <>
      <aside
        aria-label={`Order summary for ${itemCount} item${itemCount === 1 ? "" : "s"}`}
        className="sticky top-6 min-w-0 bg-[#f5f5f5] px-7 pb-8 pt-1 text-[#1e2932] max-lg:static max-sm:hidden"
      >
        {summaryContent}
      </aside>
      <details className="group order-first -mx-4 bg-[#f5f5f5] text-[#1e2932] sm:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-medium text-[#08788c]">
            Order summary{" "}
            <span className="text-xs transition-transform group-open:rotate-180">⌄</span>
          </span>
          <strong className="text-base font-semibold">
            {!totals && <span className="mr-1 text-xs font-normal text-slate-500">Est.</span>}$
            {displayedTotal.toFixed(2)}
          </strong>
        </summary>
        <div className="px-4 pb-6 pt-3">{summaryContent}</div>
      </details>
    </>
  );
}
