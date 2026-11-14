import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  stripeClient ??= new Stripe(secretKey, { appInfo: { name: "OralNex Storefront" } });
  return stripeClient;
}

export function stripeIsReady() {
  return Boolean(
    process.env.CHECKOUT_ENABLED === "true" &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}
