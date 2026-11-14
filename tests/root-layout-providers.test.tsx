import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const { pathname, getPublicCatalog } = vi.hoisted(() => ({
  pathname: { value: "/" },
  getPublicCatalog: vi.fn(async () => ({ products: [], collections: [] })),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-oralnex-pathname": pathname.value }),
}));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-font" }) }));
vi.mock("../app/data/server-catalog", () => ({ getPublicCatalog }));
vi.mock("../app/data/catalog-store", () => ({
  CatalogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="catalog">{children}</div>
  ),
}));
vi.mock("../app/data/buyer-account-store", () => ({
  BuyerAccountProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="buyer">{children}</div>
  ),
}));
vi.mock("../app/data/cart-store", () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="cart">{children}</div>
  ),
}));
vi.mock("../app/components/connectivity-status", () => ({ ConnectivityStatus: () => null }));

import RootLayout from "../app/layout";

it.each(["/", "/admin", "/admin/sign-in", "/auth/complete"])(
  "mounts only the providers needed for %s",
  async (route) => {
    pathname.value = route;
    getPublicCatalog.mockClear();
    const markup = renderToStaticMarkup(await RootLayout({ children: <main>Page content</main> }));
    expect(markup).toContain("Page content");
    expect(getPublicCatalog).toHaveBeenCalledTimes(route === "/" ? 1 : 0);
    if (route === "/admin/sign-in" || route === "/auth/complete") {
      expect(markup).not.toContain('data-provider="catalog"');
      expect(markup).not.toContain('data-provider="buyer"');
      expect(markup).not.toContain('data-provider="cart"');
    } else if (route === "/admin") {
      expect(markup).toContain('data-provider="catalog"');
      expect(markup).not.toContain('data-provider="buyer"');
      expect(markup).not.toContain('data-provider="cart"');
    } else {
      expect(markup).toContain('data-provider="catalog"');
      expect(markup).toContain('data-provider="buyer"');
      expect(markup).toContain('data-provider="cart"');
    }
  },
);
