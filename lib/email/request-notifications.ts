import "server-only";
import { sendWithLogo } from "./send-with-logo";

import { emailShell as shell, escapeHtml } from "./template";
import type { ContactRequestInput } from "../supabase/server-requests";

type RequestKind = "contact";

function configuration() {
  if (process.env.REQUEST_EMAIL_NOTIFICATIONS_ENABLED !== "true") return null;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REQUEST_EMAIL_FROM?.trim();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!apiKey || !from || !adminEmail) {
    throw new Error("Resend enquiry-email configuration is incomplete.");
  }
  return { apiKey, from, adminEmail };
}

async function sendRequestNotifications({
  kind,
  requestId,
  customerEmail,
  customerName,
  adminSubject,
  adminHtml,
  customerSubject,
  customerHtml,
}: {
  kind: RequestKind;
  requestId: string;
  customerEmail: string;
  customerName: string;
  adminSubject: string;
  adminHtml: string;
  customerSubject: string;
  customerHtml: string;
}) {
  const config = configuration();
  if (!config) return { skipped: true } as const;

  await sendWithLogo(config.apiKey, `${kind}/${requestId}`, [
    {
      from: config.from,
      to: [config.adminEmail],
      reply_to: customerEmail,
      subject: adminSubject,
      html: adminHtml,
      tags: [{ name: "request_type", value: kind }],
    },
    {
      from: config.from,
      to: [customerEmail],
      reply_to: config.adminEmail,
      subject: customerSubject,
      html: customerHtml,
      tags: [{ name: "request_type", value: kind }],
    },
  ]);
  return { skipped: false, customerName } as const;
}

export async function sendContactRequestEmails(requestId: string, input: ContactRequestInput) {
  const config = configuration();
  if (!config) return { skipped: true } as const;
  const message = escapeHtml(input.message).replace(/\r?\n/g, "<br>");
  return sendRequestNotifications({
    kind: "contact",
    requestId,
    customerEmail: input.email,
    customerName: input.name,
    adminSubject: `New ${input.topic} enquiry from ${input.name}`,
    adminHtml: shell(
      "New Customer Enquiry",
      "",
      `<p style="margin:10px 0;font-size:14px;line-height:22px"><strong>${escapeHtml(input.name)}</strong> sent a message:</p><div style="padding:16px 20px;border-left:4px solid #09a5b2;border-radius:0 10px 10px 0;background-color:#f3f6fb;color:#27365f;font-size:14px;line-height:22px;overflow-wrap:anywhere;word-break:break-word">${message}</div>`,
      "",
      undefined,
      "contact-admin",
    ),
    customerSubject: "OralNex received your enquiry",
    customerHtml: shell(
      "We’ve received your enquiry",
      "",
      `<p style="margin:0 0 16px;font-size:16px;line-height:24px;font-weight:700">Hello ${escapeHtml(input.name)},</p><p style="margin:0 0 24px;color:#27365f;font-size:15px;line-height:24px">Thank you for reaching out to <strong style="color:#071b51">OralNex</strong>. Your message has been successfully received, and our team will get back to you shortly.</p><div style="border-top:1px solid #dce7e9;padding-top:20px;color:#27365f;font-size:15px;line-height:24px">Best regards,<br><strong style="color:#071b51">The OralNex Team</strong></div>`,
      "",
      undefined,
      "contact-customer",
    ),
  });
}
