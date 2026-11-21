"use client";

import { useEffect, useState } from "react";
import { readHomeCatalogCache } from "../data/home-catalog-cache";
import { useCatalog } from "../data/catalog-store";
import { CategoryCards } from "./category-cards";

export function HomeCatalog() {
  const { products, collections, catalogLoading, catalogError, retryCatalog } = useCatalog();
  const [snapshot, setSnapshot] = useState<ReturnType<typeof readHomeCatalogCache>>(null);

  useEffect(() => {
    const cached = readHomeCatalogCache();
    if (!cached) return;
    queueMicrotask(() => setSnapshot(cached));
    const expiry = setTimeout(() => setSnapshot(null), Math.max(0, cached.expiresAt - Date.now()));
    return () => clearTimeout(expiry);
  }, []);

  // This snapshot is for homepage browsing only; cart and checkout use the provider's data.
  if ((catalogLoading || catalogError) && snapshot) {
    return (
      <CategoryCards
        collections={snapshot.catalog.collections}
        products={snapshot.catalog.products}
      />
    );
  }

  if (catalogLoading) {
    return (
      <div role="status" aria-label="Loading categories" aria-busy="true">
        <div className="grid gap-5 md:grid-cols-2 md:gap-6" aria-hidden="true">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="grid min-h-[260px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 motion-safe:animate-pulse sm:min-h-[400px]"
            >
              <div className="flex flex-col items-start justify-center gap-7 p-5 sm:gap-9 sm:p-8">
                <div className="h-7 w-3/4 rounded bg-slate-200 sm:h-8" />
                <div className="size-12 rounded-full bg-slate-200" />
              </div>
              <div className="bg-slate-200/70" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (catalogError) {
    return (
      <div className="py-8 text-center">
        <p role="status" className="text-sm text-slate-600">
          Categories are temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={retryCatalog}
          className="mt-3 min-h-11 px-4 text-sm font-semibold text-[#08788c] underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }
  return <CategoryCards collections={collections} products={products} />;
}
