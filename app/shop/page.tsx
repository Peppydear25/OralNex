import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CategoryImage } from "../components/category-image";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { collectionDestination } from "../data/collection-destination";
import { getPublicCatalog } from "../data/server-catalog";
import { ShopCategories } from "./shop-categories";

export const metadata: Metadata = {
  title: "Shop Dental & Medical Supplies",
  description:
    "Shop nitrile examination gloves and disposable surgical face masks for dental, clinical, workplace, and everyday care needs.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop Dental & Medical Supplies",
    description:
      "Browse nitrile examination gloves and disposable surgical face masks with clear specifications and volume pricing.",
    url: "/shop",
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedCategory = params.category;
  const initialCategory = Array.isArray(requestedCategory)
    ? requestedCategory[0]
    : requestedCategory;
  const catalog = initialCategory?.trim() ? await getPublicCatalog() : null;
  if (initialCategory?.trim()) {
    const collection = catalog?.collections.find(
      (item) =>
        item.slug.toLowerCase() === initialCategory.trim().toLowerCase() ||
        item.name.toLowerCase() === initialCategory.trim().toLowerCase(),
    );
    if (collection && catalog) {
      const destination = collectionDestination(collection, catalog.products);
      if (destination) redirect(destination);
      const products = catalog.products.filter(
        (product) => product.category === collection.name && product.status !== "draft",
      );
      return (
        <>
          <SiteHeader />
          <main className="store-container py-10 sm:py-14">
            <Link href="/shop" className="text-sm font-semibold text-[#08788c]">
              ← All categories
            </Link>
            <h1 className="mt-5 text-3xl font-semibold text-[#172d36]">{collection.name}</h1>
            {products.length === 0 ? (
              <p className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">
                No products are available in this category yet.
              </p>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-[#172d36] no-underline transition-colors hover:border-[#08788c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
                  >
                    <div className="relative aspect-[4/3] bg-[#f1f7f7]">
                      <CategoryImage src={product.image} alt="" />
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <h2 className="text-base font-medium leading-6">{product.name}</h2>
                      <span className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#edf6f7] px-4 text-sm font-semibold text-[#08788c] transition-colors group-hover:bg-[#08788c] group-hover:text-white">
                        View product <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
          <SiteFooter />
        </>
      );
    }
  }
  return (
    <>
      <SiteHeader />
      <main className="bg-white text-[#323232]">
        <h1 className="sr-only">Shop OralNex dental and medical supplies by category</h1>
        <ShopCategories />
      </main>
      <SiteFooter />
    </>
  );
}
