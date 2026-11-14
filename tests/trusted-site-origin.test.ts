import { afterEach, expect, it, vi } from "vitest";
import { invalidRequestOrigin, trustedSiteOrigin } from "../lib/network/trusted-site-origin";

afterEach(() => vi.unstubAllEnvs());

it("uses the configured site, not an untrusted request host", () => {
  vi.stubEnv("SITE_URL", "https://oralnex.example");
  const request = new Request("https://attacker.example/api/stripe/checkout", {
    headers: { origin: "https://oralnex.example" },
  });
  expect(trustedSiteOrigin(request)).toBe("https://oralnex.example");
  expect(invalidRequestOrigin(request, "https://oralnex.example")).toBe(false);
});

it("rejects a cross-site browser origin", () => {
  const request = new Request("https://oralnex.example/api/contact", {
    headers: { origin: "https://attacker.example" },
  });
  expect(invalidRequestOrigin(request, "https://oralnex.example")).toBe(true);
});

it("fails closed without a secure production site URL", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SITE_URL", "http://oralnex.example");
  expect(trustedSiteOrigin(new Request("https://oralnex.example/api/contact"))).toBeNull();
  vi.stubEnv("SITE_URL", "");
  expect(trustedSiteOrigin(new Request("https://oralnex.example/api/contact"))).toBeNull();
});
