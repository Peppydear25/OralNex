import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { readCatalog } = vi.hoisted(() => ({ readCatalog: vi.fn() }));
vi.mock("../app/data/catalog-store", () => ({ useCatalog: readCatalog }));
vi.mock("../app/components/category-cards", () => ({
  CategoryCards: () => <div>Live categories</div>,
}));
import { HomeCatalog } from "../app/components/home-catalog";

beforeEach(() => readCatalog.mockReset());

it("shows accessible skeleton cards while categories load", () => {
  readCatalog.mockReturnValue({ catalogLoading: true });
  const markup = renderToStaticMarkup(<HomeCatalog />);
  expect(markup).toContain('aria-label="Loading categories"');
  expect(markup).toContain('aria-busy="true"');
  expect(markup).toContain("motion-safe:animate-pulse");
  expect(markup).not.toContain("Loading categories…");
});

it("offers a local retry during an outage without showing an empty or sample catalog", () => {
  const retryCatalog = vi.fn();
  readCatalog.mockReturnValue({ catalogError: true, retryCatalog });
  const markup = renderToStaticMarkup(<HomeCatalog />);
  expect(markup).toContain("temporarily unavailable");
  expect(markup).not.toContain("Live categories");
  expect(markup).toContain("Try again");
});

it("displays the catalog after a successful load", () => {
  readCatalog.mockReturnValue({ products: [], collections: [] });
  expect(renderToStaticMarkup(<HomeCatalog />)).toContain("Live categories");
});
