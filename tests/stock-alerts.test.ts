import { expect, it } from "vitest";
import type { Product } from "../app/data/catalog";
import { getStockAlerts } from "../app/admin/dashboard/stock-alerts";

function product(id: number, inventory: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    status: "active",
    inventory,
    ...overrides,
  } as Product;
}

it("alerts on low-stock variants even when the product has plenty of boxes", () => {
  const item = product(1, 40, {
    variants: [
      { id: "small", sku: "SMALL", options: { Size: "Small" }, inventory: 3 },
      { id: "large", sku: "LARGE", options: { Size: "Large" }, inventory: 37 },
    ],
  });

  expect(getStockAlerts([item])).toEqual([
    { product: item, variant: item.variants?.[0], available: 3 },
  ]);
});

it("alerts on low-stock unvaried products and ignores drafts or stock at the threshold", () => {
  const low = product(1, 0);
  expect(getStockAlerts([low, product(2, 10), product(3, 2, { status: "draft" })])).toEqual([
    { product: low, available: 0 },
  ]);
});

it("alerts on a low product total when its variant counts are inconsistent", () => {
  const item = product(1, 2, {
    variants: [{ id: "one", options: { Size: "One" }, inventory: 12 }],
  });
  expect(getStockAlerts([item])).toEqual([{ product: item, available: 2 }]);
});
