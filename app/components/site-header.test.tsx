import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/shop",
}));

vi.mock("../data/cart-store", () => ({
  useCart: () => ({
    itemCount: 0,
    open: false,
    openCart: vi.fn(),
  }),
}));

vi.mock("../data/buyer-account-store", () => ({
  useBuyerAccount: () => ({
    buyer: null,
  }),
}));

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("keeps desktop navigation bold and mobile navigation readable", () => {
    const html = renderToStaticMarkup(<SiteHeader />);

    expect(html).toContain("font-extrabold text-[#172d36] hover:text-[#08788c]");
    expect(html).toContain("[&amp;_a]:font-medium");
    expect(html).toContain("[&amp;_a]:text-[15px]");
    expect(html).toContain("[&amp;_a]:text-[#172d36]");
  });

  it("preserves the sticky header and centered, accessible brand logo", () => {
    const html = renderToStaticMarkup(<SiteHeader />);

    expect(html).toMatch(/<header class="[^"]*sticky top-0/);
    expect(html).toContain("col-start-2 row-start-1 justify-self-center");
    expect(html).toContain('aria-label="OralNex home"');
    expect(html).toContain('alt="OralNex"');
  });

  it("identifies the active page and keeps navigation controls accessible", () => {
    const html = renderToStaticMarkup(<SiteHeader />);

    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/shop"[^>]*>Shop supplies<\/a>/);
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('aria-label="Open navigation"');
    expect(html).toContain('aria-label="Sign in or create an account"');
    expect(html).toContain('aria-label="View cart with 0 items"');
    expect(html).not.toContain('aria-label="Search products"');
    expect(html).toContain('aria-expanded="false"');
  });
});
