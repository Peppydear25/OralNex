import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { orderEmailReady, orderEmailSender } from "../lib/email/order-email-config";

const configured = {
  NODE_ENV: "test",
  ORDER_EMAIL_NOTIFICATIONS_ENABLED: "true",
  RESEND_API_KEY: "test-key",
  ORDER_EMAIL_FROM: "OralNex <orders@oralnex.com>",
  ADMIN_NOTIFICATION_EMAIL: "admin@oralnex.com",
} as NodeJS.ProcessEnv;

it("accepts an explicitly configured production sender", () => {
  expect(orderEmailReady(configured)).toBe(true);
  expect(orderEmailSender(configured)).toBe(configured.ORDER_EMAIL_FROM);
});

it("rejects a disabled email flow or a test-only sender", () => {
  expect(orderEmailReady({ ...configured, ORDER_EMAIL_NOTIFICATIONS_ENABLED: "false" })).toBe(
    false,
  );
  expect(
    orderEmailReady({
      ...configured,
      ORDER_EMAIL_FROM: "OralNex <onboarding@resend.dev>",
    }),
  ).toBe(false);
  expect(
    orderEmailReady({ ...configured, ORDER_EMAIL_FROM: "Orders <hi@updates.example.com>" }),
  ).toBe(false);
});

it("requires an order sender", () => {
  expect(orderEmailReady({ ...configured, ORDER_EMAIL_FROM: "" })).toBe(false);
});
