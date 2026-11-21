import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../app/data/supabase-catalog", () => ({ loadSupabaseCatalog: vi.fn() }));

import { CatalogProvider, useCatalog } from "../app/data/catalog-store";

function Shell() {
  const catalog = useCatalog();
  return (
    <div>
      Homepage shell
      <span>{catalog.catalogLoading ? "Loading catalog" : "Catalog ready"}</span>
      <span>{catalog.products.length} products</span>
    </div>
  );
}

it("renders the homepage before catalog hydration without substituting sample products", () => {
  const markup = renderToStaticMarkup(
    <CatalogProvider>
      <Shell />
    </CatalogProvider>,
  );
  expect(markup).toContain("Homepage shell");
  expect(markup).toContain("Loading catalog");
  expect(markup).toContain("0 products");
});

it("uses an available initial catalog immediately", () => {
  const markup = renderToStaticMarkup(
    <CatalogProvider initialCatalog={{ products: [], collections: [] }}>
      <Shell />
    </CatalogProvider>,
  );
  expect(markup).toContain("Catalog ready");
});
