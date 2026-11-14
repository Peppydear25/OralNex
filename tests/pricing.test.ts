import { describe, expect, it } from "vitest";
import type { Product } from "../app/data/catalog";
import { getIncreasingBulkTiers, getLinePricing, getUnitPrice } from "../app/lib/pricing";

const product = {
  price: 20,
  bulkPricing: [
    { minQuantity: 10, discountPercent: 5 },
    { minQuantity: 25, discountPercent: 10 },
    { minQuantity: 50, discountPercent: 15 },
  ],
} as Product;

describe("bulk pricing", () => {
  it("keeps the regular price below the first tier", () => {
    expect(getUnitPrice(product, 9)).toBe(20);
  });

  it("uses the highest qualifying tier", () => {
    expect(getUnitPrice(product, 50)).toBe(17);
  });

  it("returns the discounted total and savings", () => {
    expect(getLinePricing(product, 25)).toMatchObject({
      unitPrice: 18,
      total: 450,
      savings: 50,
    });
  });

  it("does not increase the unit price at a larger quantity break", () => {
    const inconsistent = {
      ...product,
      bulkPricing: [
        { minQuantity: 10, discountPercent: 10 },
        { minQuantity: 25, discountPercent: 25 },
        { minQuantity: 50, discountPercent: 15 },
      ],
    };
    expect(getUnitPrice(inconsistent, 50)).toBe(15);
    expect(getIncreasingBulkTiers(inconsistent.bulkPricing)).toHaveLength(2);
  });
});
