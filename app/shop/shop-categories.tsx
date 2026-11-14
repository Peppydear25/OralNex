"use client";

import Link from "next/link";
import { CategoryImage } from "../components/category-image";
import { useCatalog } from "../data/catalog-store";
import { collectionDestination } from "../data/collection-destination";

export function ShopCategories() {
  const { collections, products } = useCatalog();
  const availableCollections = collections.filter((collection) =>
    collectionDestination(collection, products),
  );

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
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {availableCollections.map((collection) => {
          const destination = collectionDestination(collection, products)!;
          const description =
            collection.name.toLowerCase() === "gloves"
              ? "Nitrile examination gloves for everyday care."
              : collection.name.toLowerCase() === "masks"
                ? "Disposable face masks for your care setting."
                : collection.description;
          return (
            <Link
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce9eb] bg-white no-underline transition-shadow hover:shadow-[0_12px_32px_rgba(15,45,55,.08)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
              href={destination}
              key={collection.slug}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#f1f7f7] sm:aspect-[16/9]">
                <CategoryImage
                  key={collection.image}
                  src={collection.image}
                  alt={`${collection.name} from OralNex`}
                  sizes="(min-width: 1400px) 628px, 46vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-7">
                <h3 className="text-xl font-semibold tracking-[-.025em] text-[#172d36] sm:text-3xl">
                  {collection.name}
                </h3>
                <p className="mt-3 max-w-[44ch] text-xs leading-6 text-slate-600 sm:text-sm">
                  {description}
                </p>
                <span className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs font-semibold text-[#08788c] sm:pt-7 sm:text-sm">
                  Explore {collection.name.toLowerCase()}
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#cbdde0] transition-colors group-hover:bg-[#08788c] group-hover:text-white"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {availableCollections.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">
          No categories are available right now. Please check back soon.
        </p>
      )}
    </section>
  );
}
