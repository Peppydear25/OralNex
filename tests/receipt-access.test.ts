import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canViewReceipt,
  createReceiptToken,
  receiptCookieName,
  receiptTokenHash,
} from "../lib/stripe/receipt-access";

it("requires the checkout browser's receipt token before revealing order details", () => {
  const token = createReceiptToken();
  const hash = receiptTokenHash(token);
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  expect(canViewReceipt(token, hash)).toBe(true);
  expect(canViewReceipt(undefined, hash)).toBe(false);
  expect(canViewReceipt(createReceiptToken(), hash)).toBe(false);
  expect(canViewReceipt(token, undefined)).toBe(false);
  expect(canViewReceipt("bad-token", hash)).toBe(false);
  expect(receiptCookieName("cs_test_123")).toBe("oralnex_receipt_cs_test_123");
});
