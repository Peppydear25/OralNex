import { describe, expect, it } from "vitest";
import { loadingKindForPath } from "./route-loading";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StorefrontLoading, StorefrontLoadingHeader } from "./storefront-loading";

describe("text-free storefront skeletons", () => {
  it.each([StorefrontLoading, StorefrontLoadingHeader])(
    "renders placeholder shapes without visible text",
    (component) => {
      const markup = renderToStaticMarkup(createElement(component));
      expect(markup.replace(/<[^>]*>/g, "").trim()).toBe("");
      expect(markup).toContain("motion-reduce:animate-none");
    },
  );

  it("announces loading without visible copy", () => {
    const markup = renderToStaticMarkup(createElement(StorefrontLoading));
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
  });
});

describe("route-specific loading layouts", () => {
  it.each([
    ["/", "home"],
    ["/admin/sign-in", "admin-sign-in"],
    ["/admin", "admin-dashboard"],
    ["/account", "account-access"],
    ["/account/forgot-password", "account-access"],
    ["/account/dashboard", "account-dashboard"],
    ["/shop", "catalog"],
    ["/products/nitrile-exam-gloves", "product"],
    ["/cart", "cart"],
    ["/checkout", "checkout"],
    ["/privacy-policy", "document"],
  ])("selects %s as %s", (path, kind) => {
    expect(loadingKindForPath(path)).toBe(kind);
  });
});
