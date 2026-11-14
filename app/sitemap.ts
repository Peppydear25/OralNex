import type { MetadataRoute } from "next";
import { getPublicCatalog } from "./data/server-catalog";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getPublicCatalog();
  const products = catalog?.products ?? [];
  const staticPages = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/shipping-policy",
    "/privacy-policy",
    "/terms-of-service",
  ];

  return [
    ...staticPages.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: path === "" || path === "/shop" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.5,
    })),
    ...products
      .filter((product) => product.status !== "draft")
      .map((product) => ({
        url: `${siteUrl}/products/${product.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      })),
  ];
}
