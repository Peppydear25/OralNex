import type { Collection, Product } from "./catalog";

export function collectionDestination(collection: Collection, products: Product[]) {
  const activeProducts = products.filter(
    (product) => product.category === collection.name && product.status !== "draft",
  );
  return activeProducts.length === 1 ? `/products/${activeProducts[0].slug}` : null;
}
