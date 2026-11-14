import "server-only";

import type Stripe from "stripe";
import { createVerifiedOrder } from "../supabase/server-orders";
import { checkoutTotals } from "./checkout-totals";
import { getStripe } from "./server";

export function orderNumberForSession(sessionId: string) {
  return `ON-${sessionId.slice(-12).toUpperCase()}`;
}

function addressRecord(
  shipping: Stripe.PaymentIntent.Shipping | null,
  company?: string,
  shippingMethod?: string,
): Record<string, string> {
  if (!shipping?.address?.line1 || !shipping.address.country) {
    throw new Error("Paid Checkout shipping address is unavailable.");
  }
  return Object.fromEntries(
    Object.entries({
      name: shipping.name,
      company,
      phone: shipping.phone,
      line1: shipping.address.line1,
      line2: shipping.address.line2,
      city: shipping.address.city,
      state: shipping.address.state,
      postalCode: shipping.address.postal_code,
      country: shipping.address.country,
      shippingMethod,
    }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]),
    ),
  );
}

/** Called by both the signed webhook and the paid-session landing page. The database RPC is idempotent. */
export async function recordPaidCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return null;
  const reservationId = session.metadata?.inventory_reservation_id;
  if (!reservationId || !/^[0-9a-f-]{36}$/i.test(reservationId))
    throw new Error("Paid Checkout inventory reservation is unavailable.");
  if (session.mode !== "payment" || session.currency !== "usd")
    throw new Error("Paid Checkout has an unexpected mode or currency.");
  const totals = checkoutTotals(session);
  if (!totals) throw new Error("Paid Checkout totals are incomplete or inconsistent.");

  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });
  if (lineItems.has_more) throw new Error("Checkout contains too many line items.");

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(session.payment_intent)
      : session.payment_intent;
  const items = lineItems.data.map((line) => {
    const stripeProduct = line.price?.product;
    if (!stripeProduct || typeof stripeProduct === "string" || stripeProduct.deleted) {
      throw new Error("Stripe line item product metadata is unavailable.");
    }
    const metadata = stripeProduct.metadata;
    const quantity = line.quantity ?? 0;
    const unitPriceCents = line.price?.unit_amount ?? 0;
    const selectedOptions = JSON.parse(
      metadata.on_options || metadata.otm_options || "{}",
    ) as Record<string, string>;
    const productId = metadata.on_product_id || metadata.otm_product_id;
    const sku = metadata.on_sku || metadata.otm_sku;
    const volumeDiscountPercent = Number(metadata.on_volume_discount_percent);
    if (!productId || !sku || quantity < 1) {
      throw new Error("Stripe line item metadata is incomplete.");
    }
    return {
      productId,
      productVariantId: metadata.on_variant_id || metadata.otm_variant_id || null,
      productName: line.description || stripeProduct.name,
      sku,
      selectedOptions,
      unitPriceCents,
      quantity,
      volumeDiscountPercent:
        Number.isInteger(volumeDiscountPercent) &&
        volumeDiscountPercent > 0 &&
        volumeDiscountPercent < 100
          ? volumeDiscountPercent
          : null,
    };
  });

  const itemSubtotalCents = items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );
  if (!items.length || itemSubtotalCents !== totals.subtotalCents)
    throw new Error("Paid Checkout items do not match the charged subtotal.");
  // Stripe's total tax already includes shipping tax. Persist the pre-tax
  // shipping amount so the order total does not count shipping tax twice.
  const customerEmail = session.customer_details?.email ?? session.customer_email;
  if (!customerEmail || !paymentIntent) throw new Error("Paid Checkout details are incomplete.");

  // Legacy/non-tax sessions store shipping on the PaymentIntent. Tax-enabled
  // sessions use a dedicated Customer created with the carrier-quoted address.
  // Do not substitute billing details, which may describe a different location.
  let shipping = paymentIntent.shipping;
  if (!shipping && session.customer) {
    const customer =
      typeof session.customer === "string"
        ? await stripe.customers.retrieve(session.customer)
        : session.customer;
    if (!customer.deleted) shipping = customer.shipping ?? null;
  }

  const order = {
    orderNumber: orderNumberForSession(session.id),
    userId: session.client_reference_id || null,
    customerEmail,
    currency: "usd",
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    stripeCheckoutSessionId: session.id,
    reservationId,
    stripePaymentIntentId: paymentIntent.id,
    shippingAddress: addressRecord(
      shipping,
      paymentIntent.metadata?.shipping_company,
      session.metadata?.shipping_method,
    ),
    items,
  } satisfies Parameters<typeof createVerifiedOrder>[0];
  const orderId = await createVerifiedOrder(order);
  return { orderId, order };
}
