import "server-only";
import type Stripe from "stripe";
import { orderEmailReady, orderEmailSender } from "./order-email-config";
import { sendWithLogo } from "./send-with-logo";
import { emailShell } from "./template";

export async function sendFailedPaymentEmail(session: Stripe.Checkout.Session) {
  const testMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
  if (!testMode && !orderEmailReady())
    throw new Error("Production payment-failure email configuration is incomplete.");
  if (testMode && process.env.ORDER_EMAIL_NOTIFICATIONS_ENABLED !== "true")
    return { skipped: true } as const;

  const email = session.customer_details?.email ?? session.customer_email;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = orderEmailSender();
  const replyTo = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!email || !apiKey || !from)
    throw new Error("Failed-payment email configuration or customer address is missing.");

  const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const html = emailShell(
    "Your payment did not go through",
    "Your payment for an OralNex order was not completed. You have not been charged for this order.",
    '<p style="margin:0">Please return to checkout and try another payment method. If you need help, contact us before placing another order.</p>',
    `${siteUrl}/checkout`,
    "Return to checkout",
  );
  await sendWithLogo(apiKey, `payment-failed/${session.id}`, [
    {
      from,
      to: [email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: "Your OralNex payment did not go through",
      html,
    },
  ]);
  return { skipped: false } as const;
}
