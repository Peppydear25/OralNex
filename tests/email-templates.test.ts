import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { emailShell, referenceBlock } from "../lib/email/template";
import { sendContactRequestEmails } from "../lib/email/request-notifications";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("provides mobile and email-client fallbacks with an embedded brand logo", () => {
  const html = emailShell(
    "Message received",
    "Thank you",
    referenceBlock("Reference", "<unsafe>"),
    "https://example.com/contact",
    "Contact us",
  );
  expect(html).toContain('name="viewport"');
  expect(html).toContain('role="presentation"');
  expect(html).toContain("[if mso]");
  expect(html).toContain("max-width:480px");
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).toContain("&lt;unsafe&gt;");
  expect(html).not.toContain("<script");
  expect(html).toContain('src="cid:oralnex-logo"');
  expect(html).toContain('alt="OralNex"');
  for (const variant of ["order", "contact-admin", "contact-customer"] as const) {
    const variantHtml = emailShell("Title", "", "", "", undefined, variant);
    expect(variantHtml).toContain('width="68" height="68"');
    expect(variantHtml).toContain("text-align:center");
  }
});

it("preserves recipients and safely formats contact enquiries", async () => {
  vi.stubEnv("REQUEST_EMAIL_NOTIFICATIONS_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "test");
  vi.stubEnv("REQUEST_EMAIL_FROM", "support@example.com");
  vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "admin@example.com");
  vi.stubEnv("SITE_URL", "https://example.com");
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  const input = {
    name: "Buyer <test>",
    email: "buyer@example.com",
    message: "First line\n<script>alert(1)</script>",
  };
  await sendContactRequestEmails("ref-123", { ...input, topic: "Products" });
  const request = fetchMock.mock.calls[0][1];
  const [admin, buyer] = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
  expect(admin.to).toEqual(["admin@example.com"]);
  expect(buyer.to).toEqual(["buyer@example.com"]);
  expect(admin.reply_to).toBe("buyer@example.com");
  expect(buyer.reply_to).toBe("admin@example.com");
  expect(request.headers["Idempotency-Key"]).toBe("contact/ref-123/0");
  expect(admin.html).toContain("First line<br>&lt;script&gt;");
  expect(admin.html).not.toContain("<script>");
  expect(buyer.html).toContain("Buyer &lt;test&gt;");
  expect(admin.html).toContain("New Customer Enquiry");
  expect(admin.html).toContain("sent a message:");
  expect(buyer.html).toContain("We’ve received your enquiry");
  expect(buyer.html).toContain("The OralNex Team");
  expect(buyer.html).not.toContain("Enquiry reference");
  expect(buyer.html).not.toContain("Contact our team");
  expect(admin.html).toContain("word-break:break-word");
});
