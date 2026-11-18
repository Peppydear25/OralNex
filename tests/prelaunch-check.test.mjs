import { expect, it } from "vitest";
import { validatePrelaunchConfiguration } from "../scripts/prelaunch-check.mjs";

const staging = {
  SITE_URL: "https://staging.oralnex.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
  SUPABASE_SECRET_KEY: "server-secret",
  CHECKOUT_ENABLED: "false",
  STRIPE_AUTOMATIC_TAX_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
};

it("blocks launch while EasyPost and checkout are unconfigured", () => {
  const issues = validatePrelaunchConfiguration(staging);
  expect(issues).toContain("EASYPOST_API_KEY is missing.");
  expect(issues).toContain("CHECKOUT_ENABLED must be true for launch.");
});

it("rejects local origins and test-mode keys for production", () => {
  const issues = validatePrelaunchConfiguration(
    { ...staging, SITE_URL: "http://localhost:3000" },
    "production",
  );
  expect(issues).toContain("SITE_URL must be the exact HTTPS storefront origin.");
  expect(issues).toContain("STRIPE_SECRET_KEY must be a live-mode secret key.");
  expect(issues).toContain("EASYPOST_API_KEY is missing.");
});

it("does not print or return secret values in findings", () => {
  const issues = validatePrelaunchConfiguration({
    ...staging,
    STRIPE_WEBHOOK_SECRET: "bad-secret",
  });
  expect(issues.join(" ")).not.toContain("bad-secret");
});

it("rejects a test-only sender and disabled order confirmations", () => {
  const issues = validatePrelaunchConfiguration(
    {
      ...staging,
      ORDER_EMAIL_NOTIFICATIONS_ENABLED: "false",
      RESEND_API_KEY: "test-key",
      ORDER_EMAIL_FROM: "OralNex <onboarding@resend.dev>",
      ADMIN_NOTIFICATION_EMAIL: "admin@oralnex.com",
    },
    "production",
  );
  expect(issues).toContain("ORDER_EMAIL_NOTIFICATIONS_ENABLED must be true for launch.");
  expect(issues).toContain("Order email sender must use a verified production domain.");
});

it("allows test-mode staging without a production email sender", () => {
  const issues = validatePrelaunchConfiguration(staging);
  expect(issues).not.toContain("Order email sender must use a verified production domain.");
});
