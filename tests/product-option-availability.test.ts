import { expect, it } from "vitest";
import type { Product } from "../app/data/catalog";
import { getInitialOptionSelection, isOptionValueAvailable } from "../app/lib/product-options";

const product = {
  id: 1,
  slug: "gloves",
  name: "Gloves",
  category: "Gloves",
  type: "Gloves",
  price: 10,
  oldPrice: null,
  image: "",
  stock: true,
  summary: "",
  description: "",
  features: [],
  specifications: [],
  options: [
    { name: "Size", values: ["Small", "Medium"] },
    { name: "Color", values: ["Blue", "Black"] },
  ],
  variants: [
    { id: "small-blue", options: { Size: "Small", Color: "Blue" }, inventory: 0 },
    { id: "small-black", options: { Size: "Small", Color: "Black" }, inventory: 0 },
    { id: "medium-blue", options: { Size: "Medium", Color: "Blue" }, inventory: 0 },
    { id: "medium-black", options: { Size: "Medium", Color: "Black" }, inventory: 4 },
  ],
} satisfies Product;

it("starts with an in-stock combination and disables only globally unavailable choices", () => {
  expect(getInitialOptionSelection(product)).toEqual({ Size: "Medium", Color: "Black" });
  expect(isOptionValueAvailable(product, "Color", "Blue")).toBe(false);
  expect(isOptionValueAvailable(product, "Color", "Black")).toBe(true);
  expect(isOptionValueAvailable(product, "Size", "Small")).toBe(false);
  expect(isOptionValueAvailable(product, "Size", "Medium")).toBe(true);
});
