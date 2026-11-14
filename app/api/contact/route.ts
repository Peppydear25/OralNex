import { createContactRequest } from "../../../lib/supabase/server-requests";
import { sendContactRequestEmails } from "../../../lib/email/request-notifications";
import { after } from "next/server";
import { reportServiceFailure } from "../../../lib/errors/report-service-failure";
import { allowApiRequest, rateLimitResponse } from "../../../lib/network/api-rate-limit";
import { readJsonBody, RequestBodyError } from "../../../lib/network/read-json-body";
import { invalidRequestOrigin, trustedSiteOrigin } from "../../../lib/network/trusted-site-origin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const siteOrigin = trustedSiteOrigin(request);
  if (!siteOrigin) return Response.json({ error: "Service is not configured." }, { status: 503 });
  if (invalidRequestOrigin(request, siteOrigin)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const parsed = await readJsonBody(request, 8_192);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json({ error: "Invalid form details." }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
    if (String(body.companyWebsite ?? "")) return Response.json({ ok: true });

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const topic = String(body.topic ?? "General question").trim();
    const orderNumber = String(body.orderNumber ?? "").trim() || null;
    const message = String(body.message ?? "").trim();
    if (
      name.length < 2 ||
      name.length > 80 ||
      !emailPattern.test(email) ||
      email.length > 254 ||
      topic.length < 2 ||
      topic.length > 80 ||
      (orderNumber?.length ?? 0) > 50 ||
      message.length < 10 ||
      message.length > 2000
    ) {
      return Response.json({ error: "Invalid form details." }, { status: 400 });
    }

    if (!(await allowApiRequest("contact", email))) return rateLimitResponse("contact");

    const input = { name, email, topic, orderNumber, message };
    const requestId = await createContactRequest(input);
    after(async () => {
      try {
        await sendContactRequestEmails(requestId, input);
      } catch (error) {
        reportServiceFailure("contact.notification", error);
      }
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    reportServiceFailure("contact.save", error);
    return Response.json({ error: "Request could not be saved." }, { status: 503 });
  }
}
