"use client";

import { CategoryCards } from "../components/category-cards";
import { useCatalog } from "../data/catalog-store";

export function ShopCategories() {
  const { collections, products } = useCatalog();

  return (
    <section className="store-container py-10 sm:py-14" aria-labelledby="shop-category-title">
      <div className="mb-7 sm:mb-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#08788c]">
          Explore OralNex
        </p>
        <h2
          className="text-3xl font-semibold tracking-tight text-[#172d36] sm:text-4xl"
          id="shop-category-title"
        >
          Shop by category
        </h2>
        <div className="mt-4 h-1 w-12 rounded-full bg-[#0a8d99]" aria-hidden="true" />
      </div>
      <CategoryCards collections={collections} products={products} eagerImages={2} />
    </section>
  );
}
