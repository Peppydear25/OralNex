import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkoutAttemptKeys } from "../lib/stripe/checkout-attempt";

it("binds Stripe idempotency and receipt tokens to one verified checkout attempt", () => {
  const details = { email: "buyer@example.com", totalCents: 2695 };
  const first = checkoutAttemptKeys("server-secret", "attempt-1", details);

  expect(checkoutAttemptKeys("server-secret", "attempt-1", details)).toEqual(first);
  expect(checkoutAttemptKeys("server-secret", "attempt-2", details)).not.toEqual(first);
  expect(
    checkoutAttemptKeys("server-secret", "attempt-1", { ...details, totalCents: 2700 }),
  ).not.toEqual(first);
  expect(JSON.stringify(first)).not.toContain(details.email);
  expect(first.customer).not.toBe(first.session);
  expect(first.receiptToken).toMatch(/^[0-9a-f]{64}$/);
});
