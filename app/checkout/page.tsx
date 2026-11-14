import type { Metadata } from "next";
import { CheckoutView } from "./checkout-view";
import { CheckoutFrame } from "./checkout-frame";
import { redirectAdminFromBuyerAccount } from "../account/auth";
import { easypostReady } from "../../lib/shipping/easypost-rates";
import { checkoutEmailReady } from "../../lib/email/order-email-config";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your OralNex medical-equipment order and delivery details.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  await redirectAdminFromBuyerAccount();
  const paymentReady = Boolean(
    process.env.CHECKOUT_ENABLED === "true" &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    checkoutEmailReady(),
  );
  const shippingReady = easypostReady();
  return (
    <CheckoutFrame backHref="/cart" backLabel="Return to cart">
      <CheckoutView
        paymentReady={paymentReady}
        shippingReady={shippingReady}
        stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      />
    </CheckoutFrame>
  );
}
