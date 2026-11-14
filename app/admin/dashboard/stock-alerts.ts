import type { Product, ProductVariant } from "../../data/catalog";

const LOW_STOCK_THRESHOLD = 10;

type StockAlert = {
  product: Product;
  variant?: ProductVariant;
  available: number;
};

export function getStockAlerts(products: Product[]): StockAlert[] {
  return products.flatMap((product) => {
    if (product.status === "draft") return [];
    if (product.variants?.length) {
      const variantAlerts = product.variants
        .filter((variant) => variant.inventory < LOW_STOCK_THRESHOLD)
        .map((variant) => ({ product, variant, available: variant.inventory }));
      if (variantAlerts.length) return variantAlerts;
    }
    const available = product.inventory ?? 0;
    return available < LOW_STOCK_THRESHOLD ? [{ product, available }] : [];
  });
}
