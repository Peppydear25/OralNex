import "server-only";

import { createAdminClient } from "./admin";

export type VerifiedOrderInput = {
  orderNumber: string;
  userId?: string | null;
  customerEmail: string;
  currency: "usd";
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  stripeCheckoutSessionId: string;
  reservationId: string;
  stripePaymentIntentId?: string | null;
  shippingAddress: Record<string, string>;
  items: Array<{
    productId: string;
    productVariantId?: string | null;
    productName: string;
    sku: string;
    selectedOptions: Record<string, string>;
    unitPriceCents: number;
    quantity: number;
  }>;
};

/**
 * Reserved for a verified Stripe webhook. Do not call this from a browser or
 * before independently recalculating prices, discounts, tax, shipping, and stock.
 */
export async function createVerifiedOrder(input: VerifiedOrderInput) {
  const { data, error } = await createAdminClient().rpc("create_verified_order", {
    payload: {
      order_number: input.orderNumber,
      user_id: input.userId ?? null,
      customer_email: input.customerEmail,
      currency: input.currency,
      subtotal_cents: input.subtotalCents,
      shipping_cents: input.shippingCents,
      tax_cents: input.taxCents,
      total_cents: input.totalCents,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      reservation_id: input.reservationId,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      shipping_address: input.shippingAddress,
      items: input.items.map((item) => ({
        product_id: item.productId,
        product_variant_id: item.productVariantId ?? null,
        product_name: item.productName,
        sku: item.sku,
        selected_options: item.selectedOptions,
        unit_price_cents: item.unitPriceCents,
        quantity: item.quantity,
      })),
    },
  });
  if (error) throw error;
  return String(data);
}
