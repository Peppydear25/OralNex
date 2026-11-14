import { expect, it } from "vitest";
import { buyerPaymentStatus } from "../app/account/dashboard/payment-status";

it("shows paid for fulfilled orders without changing their stored status", () => {
  for (const status of ["paid", "processing", "packed", "shipped", "delivered"] as const) {
    expect(buyerPaymentStatus(status)).toBe("paid");
  }
});

it("keeps unpaid or reversed states distinct", () => {
  expect(buyerPaymentStatus("pending")).toBe("pending");
  expect(buyerPaymentStatus("cancelled")).toBe("cancelled");
  expect(buyerPaymentStatus("refunded")).toBe("refunded");
});
