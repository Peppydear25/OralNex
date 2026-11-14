import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { products } from "../data/catalog";

vi.mock("../data/cart-store", () => ({
  useCart: () => ({
    open: true,
    itemCount: 2,
    items: [{ productId: products[0].id, quantity: 2 }],
    closeCart: vi.fn(),
  }),
}));

vi.mock("../data/catalog-store", () => ({
  useCatalog: () => ({ products }),
}));

import { CartDrawer } from "./cart-drawer";

it("renders a compact, non-modal cart preview with a full-cart link", () => {
  const html = renderToStaticMarkup(<CartDrawer />);
  expect(html).toContain('aria-label="Cart preview"');
  expect(html).toContain("max-h-[min(70vh,32rem)]");
  expect(html).not.toContain('aria-modal="true"');
  expect(html).not.toContain("fixed inset-0");
  expect(html).toContain('href="/cart"');
  expect(html).toContain("Continue shopping");
});
