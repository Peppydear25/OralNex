import { expect, it } from "vitest";
import { formatAddressText } from "../app/checkout/format-address-text";

it("uses sentence case for street and city fields", () => {
  expect(formatAddressText("423 COPPER AVE NW")).toBe("423 Copper ave nw");
  expect(formatAddressText("ALBUQUERQUE")).toBe("Albuquerque");
  expect(formatAddressText("san FRANCISCO")).toBe("San francisco");
});

it("handles empty values", () => {
  expect(formatAddressText(undefined)).toBe("");
});
