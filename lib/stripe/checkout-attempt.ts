import "server-only";

import { createHmac } from "node:crypto";

/** Bind a browser attempt to the verified server-side order without exposing PII in Stripe keys. */
export function checkoutAttemptKeys(secret: string, attemptId: string, details: unknown) {
  const fingerprint = createHmac("sha256", secret)
    .update(`oralnex-checkout-v1\0${attemptId}\0${JSON.stringify(details)}`)
    .digest("hex");
  const derive = (purpose: string) =>
    createHmac("sha256", secret).update(`${purpose}\0${fingerprint}`).digest("hex");

  return {
    customer: `oralnex-customer-${derive("customer")}`,
    session: `oralnex-session-${derive("session")}`,
    receiptToken: derive("receipt"),
  };
}
