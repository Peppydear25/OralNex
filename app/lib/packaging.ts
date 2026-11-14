import type { Product } from "../data/catalog";

export function productUnits(product: Product, quantity: number) {
  return product.packaging ? (quantity === 1 ? "box" : "boxes") : quantity === 1 ? "item" : "items";
}

export function piecesPerCarton(product: Product) {
  return product.packaging
    ? product.packaging.piecesPerBox * product.packaging.boxesPerCarton
    : null;
}
