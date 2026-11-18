import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CategoryCards } from "../app/components/category-cards";
import { collections, products } from "../app/data/catalog";

vi.mock("../app/components/category-image", () => ({ CategoryImage: () => null }));

describe("category cards", () => {
  it("shows an empty state when the catalog has no categories", () => {
    const html = renderToStaticMarkup(<CategoryCards collections={[]} products={[]} />);
    expect(html).toContain("No categories have been added yet");
  });

  it("shows categories even when they have no products or several products", () => {
    const category = collections[0];
    const product = products.find((item) => item.category === category.name)!;
    for (const items of [[], [product, { ...product, slug: "another-product" }]]) {
      const html = renderToStaticMarkup(
        <CategoryCards collections={[category]} products={items} />,
      );
      expect(html).toContain(category.name);
      expect(html).toContain(`/shop?category=${encodeURIComponent(category.slug)}`);
    }
  });
});
