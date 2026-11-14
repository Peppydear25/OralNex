import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createReceiptToken() {
  return randomBytes(32).toString("hex");
}

export function receiptCookieName(sessionId: string) {
  return `oralnex_receipt_${sessionId.slice(-24)}`;
}

export function receiptTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canViewReceipt(token: string | undefined, expectedHash: string | undefined) {
  if (
    !token ||
    !/^[0-9a-f]{64}$/.test(token) ||
    !expectedHash ||
    !/^[0-9a-f]{64}$/.test(expectedHash)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(receiptTokenHash(token), "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}
