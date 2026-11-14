import type Stripe from "stripe";

export type CheckoutTotals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

/** Only expose complete, consistent Stripe totals; a pending tax is not zero tax. */
export function checkoutTotals(session: Stripe.Checkout.Session): CheckoutTotals | null {
  if (session.automatic_tax.enabled && session.automatic_tax.status !== "complete") return null;
  const subtotalCents = session.amount_subtotal;
  const shippingCents = session.shipping_cost?.amount_subtotal;
  const taxCents = session.total_details?.amount_tax;
  const totalCents = session.amount_total;
  if (
    typeof subtotalCents !== "number" ||
    typeof shippingCents !== "number" ||
    typeof taxCents !== "number" ||
    typeof totalCents !== "number" ||
    ![subtotalCents, shippingCents, taxCents, totalCents].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    subtotalCents + shippingCents + taxCents !== totalCents
  )
    return null;
  return { subtotalCents, shippingCents, taxCents, totalCents };
}
