import { describe, expect, it } from "vitest";
import { collections, products } from "./catalog";
import { collectionDestination } from "./collection-destination";

describe("collectionDestination", () => {
  const collection = collections[0];
  const product = products.find((item) => item.category === collection.name)!;

  it("opens the product directly when a category has one active product", () => {
    expect(collectionDestination(collection, [product])).toBe(`/products/${product.slug}`);
  });

  it("does not choose an arbitrary product when a category has multiple active products", () => {
    expect(
      collectionDestination(collection, [product, { ...product, slug: "another-product" }]),
    ).toBeNull();
  });

  it("does not link to a draft product", () => {
    expect(collectionDestination(collection, [{ ...product, status: "draft" }])).toBeNull();
  });
});
