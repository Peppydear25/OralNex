import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
      (item) => item.name.toLowerCase() === initialCategory.trim().toLowerCase(),
    );
    if (collection && catalog) {
      const destination = collectionDestination(collection, catalog.products);
      if (destination) redirect(destination);
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
