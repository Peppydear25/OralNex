import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sendWithLogo } = vi.hoisted(() => ({ sendWithLogo: vi.fn() }));
vi.mock("../lib/email/send-with-logo", () => ({ sendWithLogo }));
import { sendFailedPaymentEmail } from "../lib/email/payment-failed";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("sends one idempotent retry notice to the failed checkout customer", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("ORDER_EMAIL_NOTIFICATIONS_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("ORDER_EMAIL_FROM", "OralNex <onboarding@resend.dev>");
  vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "info@oralnex.com");
  vi.stubEnv("SITE_URL", "https://oralnex.com");

  await sendFailedPaymentEmail({
    id: "cs_test_failed",
    customer_details: { email: "buyer@example.com" },
  } as Parameters<typeof sendFailedPaymentEmail>[0]);

  expect(sendWithLogo).toHaveBeenCalledWith("re_test", "payment-failed/cs_test_failed", [
    expect.objectContaining({
      to: ["buyer@example.com"],
      reply_to: "info@oralnex.com",
      subject: "Your OralNex payment did not go through",
      html: expect.stringContaining("https://oralnex.com/checkout"),
    }),
  ]);
});

it("does not notify in test mode when order emails are disabled", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("ORDER_EMAIL_NOTIFICATIONS_ENABLED", "false");
  expect(
    await sendFailedPaymentEmail({ id: "cs_test_failed" } as Parameters<
      typeof sendFailedPaymentEmail
    >[0]),
  ).toEqual({ skipped: true });
  expect(sendWithLogo).not.toHaveBeenCalled();
});
