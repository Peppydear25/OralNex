import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe/server";
import { recordPaidCheckout } from "../../../../lib/stripe/record-paid-checkout";
import { sendPaidOrderEmails } from "../../../../lib/email/order-confirmation";
import { sendFailedPaymentEmail } from "../../../../lib/email/payment-failed";
import { EmailDeliveryError } from "../../../../lib/email/send-with-logo";
import { OrderEmailConfigurationError } from "../../../../lib/email/order-email-config";
import { reportServiceFailure } from "../../../../lib/errors/report-service-failure";
import { releaseCheckoutInventory } from "../../../../lib/stripe/inventory-reservations";
import { readRawBody } from "../../../../lib/network/read-raw-body";
import { RequestBodyError } from "../../../../lib/network/read-json-body";

const MAX_WEBHOOK_BYTES = 1_048_576;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret) {
    return new Response("Webhook signature configuration is missing.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await readRawBody(request, MAX_WEBHOOK_BYTES);
    event = getStripe().webhooks.constructEvent(Buffer.from(body), signature, webhookSecret);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return new Response(error.message, { status: error.status });
    }
    return new Response("Invalid Stripe signature.", { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const reservationId = event.data.object.metadata?.inventory_reservation_id;
      if (reservationId) await releaseCheckoutInventory(reservationId, event.data.object.id);
    }
    if (event.type === "checkout.session.async_payment_failed") {
      try {
        await sendFailedPaymentEmail(event.data.object);
      } catch (error) {
        reportServiceFailure(
          error instanceof EmailDeliveryError
            ? `payment.failed_notification.http_${error.status}`
            : "payment.failed_notification",
          error,
        );
        return new Response("Payment failure notification pending retry.", { status: 503 });
      }
    }
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const recorded = await recordPaidCheckout(event.data.object);
      if (recorded) {
        try {
          await sendPaidOrderEmails(recorded.order);
        } catch (error) {
          reportServiceFailure(
            error instanceof OrderEmailConfigurationError
              ? "order.notification.configuration"
              : error instanceof EmailDeliveryError
                ? `order.notification.http_${error.status}`
                : "order.notification",
            error,
          );
          // Do not acknowledge undelivered mail: Stripe must retry with the same keys.
          return new Response("Order recorded; notification delivery pending retry.", {
            status: 503,
          });
        }
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    reportServiceFailure("stripe.webhook.processing", error);
    return new Response("Webhook processing failed.", { status: 500 });
  }
}
