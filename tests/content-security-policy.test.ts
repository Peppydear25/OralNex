import { afterEach, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "../lib/security/content-security-policy";

afterEach(() => vi.unstubAllEnvs());

it("allows only nonced inline scripts and keeps Stripe script access", () => {
  vi.stubEnv("NODE_ENV", "production");
  const policy = contentSecurityPolicy("safe-test-nonce");
  const scriptPolicy = policy.split("; ").find((part) => part.startsWith("script-src"));
  expect(scriptPolicy).toContain("'nonce-safe-test-nonce'");
  expect(scriptPolicy).toContain("https://js.stripe.com");
  expect(scriptPolicy).not.toContain("'unsafe-inline'");
  expect(scriptPolicy).not.toContain("'unsafe-eval'");
  expect(policy).toContain("frame-ancestors 'none'");
});

it("allows development eval without weakening the production policy", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(contentSecurityPolicy("nonce")).toContain("'unsafe-eval'");
});

it("allows the configured Sentry ingest origin without weakening the rest of connect-src", () => {
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o123.ingest.us.sentry.io/456");
  const policy = contentSecurityPolicy("nonce");
  const connectPolicy = policy.split("; ").find((part) => part.startsWith("connect-src"));
  expect(connectPolicy).toContain("https://o123.ingest.us.sentry.io");
  expect(connectPolicy).not.toContain("public@");
  expect(connectPolicy).toContain("https://api.stripe.com");
});
