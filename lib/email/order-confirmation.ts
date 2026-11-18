import "server-only";
import { sendWithLogo } from "./send-with-logo";
import {
  OrderEmailConfigurationError,
  orderEmailReady,
  orderEmailSender,
} from "./order-email-config";

import { emailShell, escapeHtml, referenceBlock } from "./template";
import { displayReference } from "../display-reference";
import type { VerifiedOrderInput } from "../supabase/server-orders";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function itemRows(order: VerifiedOrderInput) {
  return order.items
    .map((item) => {
      const options = Object.entries(item.selectedOptions)
        .map(([name, value]) => `${escapeHtml(name)}: ${escapeHtml(value)}`)
        .join(" · ");
      return `<tr>
        <td style="padding:12px 12px 12px 0;border-bottom:1px solid #dce7e9;vertical-align:top;overflow-wrap:anywhere;word-break:break-word">
          <strong style="font-size:14px;line-height:21px">${escapeHtml(item.productName)}</strong><br><span class="muted" style="color:#6e7d9a;font-size:12px;line-height:19px">Qty ${item.quantity}${options ? ` · ${options}` : ""}</span>
        </td>
        <td width="90" style="width:90px;padding:12px 0;border-bottom:1px solid #dce7e9;text-align:right;vertical-align:top;white-space:nowrap;font-weight:700">${money(item.unitPriceCents * item.quantity)}</td>
      </tr>`;
    })
    .join("");
}

function orderDetails(order: VerifiedOrderInput) {
  const shippingLabel = order.shippingAddress.shippingMethod
    ? `Shipping (${escapeHtml(order.shippingAddress.shippingMethod)})`
    : "Shipping";
  return `${referenceBlock("Order reference", displayReference(order.orderNumber))}
    <h2 style="margin:0;font-size:17px;line-height:25px">Order summary</h2>
    <table aria-label="Order summary" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px;line-height:21px">
      <thead><tr><th scope="col" style="text-align:left;padding-top:12px;font-size:12px;font-weight:400">Item</th><th scope="col" width="90" style="width:90px;text-align:right;padding-top:12px;font-size:12px;font-weight:400">Amount</th></tr></thead>
      <tbody>${itemRows(order)}</tbody>
      <tfoot>
        <tr><td style="padding:16px 0 4px">Subtotal</td><td style="padding:16px 0 4px;text-align:right;white-space:nowrap">${money(order.subtotalCents)}</td></tr>
        <tr><td style="padding:4px 0">${shippingLabel}</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${money(order.shippingCents)}</td></tr>
        <tr><td style="padding:4px 0 16px">Tax</td><td style="padding:4px 0 16px;text-align:right;white-space:nowrap">${money(order.taxCents)}</td></tr>
        <tr><td style="padding:16px 0;border-top:1px solid #dce7e9;font-weight:700">Total paid <span style="font-size:11px;font-weight:400">USD</span></td><td style="padding:16px 0;border-top:1px solid #dce7e9;text-align:right;font-size:20px;font-weight:700;white-space:nowrap">${money(order.totalCents)}</td></tr>
      </tfoot>
    </table>
  `;
}

function shippingBlock(order: VerifiedOrderInput) {
  const address = order.shippingAddress;
  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  const locality = [cityState, address.postalCode].filter(Boolean).join(" ");
  const destination = [address.line1, address.line2, locality, address.country]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");
  return `<strong>${escapeHtml(address.name ?? "")}</strong><br><span style="color:#3167b8">${destination}</span>`;
}

export async function sendPaidOrderEmails(order: VerifiedOrderInput) {
  const testMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
  if (!testMode && !orderEmailReady()) {
    throw new OrderEmailConfigurationError();
  }
  if (testMode && process.env.ORDER_EMAIL_NOTIFICATIONS_ENABLED !== "true")
    return { skipped: true } as const;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = orderEmailSender();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!apiKey || !from || !adminEmail) throw new OrderEmailConfigurationError();

  const details = orderDetails(order);
  const buyerHtml = emailShell(
    "Your order is confirmed",
    "Thank you for your order! Your payment is confirmed and we're getting it ready to ship.",
    `${details}<div style="margin-top:22px;line-height:1.5;font-size:13px"><strong style="display:block;margin-bottom:6px;font-size:16px">Delivery address</strong>${shippingBlock(order)}</div>`,
    "",
  );
  const adminHtml = emailShell(
    "New paid order",
    `Payment of <strong>${money(order.totalCents)}</strong> from <a href="mailto:${escapeHtml(order.customerEmail)}">${escapeHtml(order.customerEmail)}</a> is confirmed. This order is ready to fulfill.`,
    `${details}<div style="margin-top:22px;line-height:1.5;font-size:13px"><strong style="display:block;margin-bottom:6px;font-size:16px">Ship to</strong>${shippingBlock(order)}</div>`,
    "",
  );

  await sendWithLogo(apiKey, `order-confirmed/${order.stripeCheckoutSessionId}`, [
    {
      from,
      to: [order.customerEmail],
      reply_to: adminEmail,
      subject: `Order ${displayReference(order.orderNumber)} confirmed`,
      html: buyerHtml,
    },
    {
      from,
      to: [adminEmail],
      subject: `New paid order ${order.orderNumber}`,
      html: adminHtml,
    },
  ]);
  return { skipped: false } as const;
}
