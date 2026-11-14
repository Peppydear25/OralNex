import { expect, it } from "vitest";
import { checkoutErrorMessage } from "../app/checkout/checkout-errors";
import { imagePreparationMessage } from "../app/admin/dashboard/utils";

it("uses fixed customer messages instead of provider details", () => {
  expect(checkoutErrorMessage(503, "DATABASE_PASSWORD=private")).not.toContain("private");
  expect(checkoutErrorMessage(400, "STOCK_UNAVAILABLE")).toContain("cart");
  expect(checkoutErrorMessage(400)).toContain("checkout details");
  expect(checkoutErrorMessage(429)).toContain("wait");
  expect(checkoutErrorMessage(503, "SHIPPING_RATE_UNAVAILABLE")).toContain("shipping carrier");
  expect(checkoutErrorMessage(503, "CHECKOUT_SETUP_REQUIRED")).toContain("No payment was started");
});

it("only displays known image-validation messages", () => {
  expect(imagePreparationMessage(new Error("Image must be smaller than 8 MB."), "Try again.")).toBe(
    "Image must be smaller than 8 MB.",
  );
  expect(imagePreparationMessage(new Error("Storage key: private"), "Try again.")).toBe(
    "Try again.",
  );
});
