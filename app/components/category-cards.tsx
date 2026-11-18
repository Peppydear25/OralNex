import Link from "next/link";
import type { Collection, Product } from "../data/catalog";
import { collectionDestination } from "../data/collection-destination";
import { CategoryImage } from "./category-image";

export function CategoryCards({
  collections,
  products,
}: {
  collections: Collection[];
  products: Product[];
}) {
  if (collections.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">
        No categories have been added yet. Please check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      {collections.map((category) => (
        <Link
          className="home-category-card group relative isolate grid min-h-[260px] min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-hidden rounded-3xl border border-[#c9e5e8] text-[#172d36] no-underline transition-colors hover:border-[#08788c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c] sm:min-h-[400px]"
          href={
            collectionDestination(category, products) ??
            `/shop?category=${encodeURIComponent(category.slug)}`
          }
          key={category.slug}
        >
          <div className="relative z-10 flex min-w-0 flex-col items-start justify-center gap-7 p-5 sm:gap-9 sm:p-8">
            <h3 className="w-full break-words text-xl font-semibold leading-tight sm:text-2xl">
              {category.name}
            </h3>
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full bg-[#08788c] text-white transition-colors group-hover:bg-[#066678] group-focus-visible:bg-[#066678]"
              aria-hidden="true"
            >
              <svg
                className="size-6 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </span>
          </div>
          <span className="relative z-10 block min-h-full min-w-0 overflow-hidden">
            <CategoryImage
              key={category.image}
              src={category.image}
              sizes="(min-width: 1740px) 440px, (min-width: 768px) 26vw, 55vw"
              animate
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
