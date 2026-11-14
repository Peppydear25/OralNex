import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProductEditor } from "../app/admin/dashboard/product-editor";
import { products } from "../app/data/catalog";

it("shows only the selected product section while keeping other form fields mounted", () => {
  const product = products[0];
  expect(product).toBeDefined();
  const html = renderToStaticMarkup(
    <ProductEditor product={product} collections={[]} onClose={() => {}} onSave={() => {}} />,
  );

  expect(html).toContain('aria-pressed="true">Details</button>');
  expect(html).toContain('data-editor-tab="details"');
  expect(html).toContain('data-editor-tab="inventory" hidden=""');
  expect(html).toContain('data-editor-tab="shipping"');
  expect(html).toContain('name="boxesPerCarton"');
  expect(html).toContain('name="description"');
  expect(html).toContain('noValidate=""');
});
