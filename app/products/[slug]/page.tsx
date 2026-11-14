import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { products as fallbackProducts } from "../../data/catalog";
import { getCurrentPublicProduct, getPublicCatalog } from "../../data/server-catalog";
import { ProductView } from "./product-view";

export function generateStaticParams() {
  return fallbackProducts.map(({ slug }) => ({ slug }));
}

const getProduct = cache(async (slug: string) => {
  const catalog = await getPublicCatalog();
  return (
    catalog?.products.find((item) => item.slug === slug && item.status !== "draft") ??
    (await getCurrentPublicProduct(slug))
  );
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || product.status === "draft") return { robots: { index: false, follow: false } };
  return {
    title: `${product.name} | Dental & Medical Supplies`,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      url: `/products/${product.slug}`,
      type: "website",
      images: [{ url: product.image, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || product.status === "draft") notFound();
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteUrl}/products/${product.slug}#product`,
    name: product.name,
    description: product.description,
    image: (product.images?.length ? product.images : [product.image]).map((image) =>
      image.startsWith("http") ? image : `${siteUrl}${image}`,
    ),
    sku: product.sku,
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: "USD",
      price: product.price.toFixed(2),
      availability: product.stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "OralNex" },
    },
  };
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
        }}
      />
      <ProductView product={product} />
    </>
  );
}
