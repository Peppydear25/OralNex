import "server-only";
import { createHash } from "node:crypto";
import { fetchWithRetry } from "../../lib/network/fetch-with-retry";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseConfig, isSupabaseConfigured } from "../../lib/supabase/config";
import { defaultCatalogState, type CatalogState } from "./catalog-state";
import { loadSupabaseCatalog } from "./supabase-catalog";
import { reportServiceFailure } from "../../lib/errors/report-service-failure";

let lastGood: { scope: string; catalog: CatalogState; readAt: number } | undefined;

// Only anonymous, RLS-filtered catalog data belongs in this shared cache.
// Never pass a cookie-backed/admin client here. Checkout reads fresh stock/prices.
// Keep the current non-Cache-Components architecture; enabling it is a separate migration.
const loadPublicCatalog = unstable_cache(
  async (cacheScope: string) => {
    // Separate deployments without exposing configuration in cache error logs.
    void cacheScope;
    try {
      const { url, publishableKey } = getSupabaseConfig();
      const { catalog, error, diagnostic } = await loadSupabaseCatalog(
        createSupabaseClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { fetch: fetchWithRetry },
        }),
      );
      // Throw rather than caching a temporary outage as an empty storefront.
      if (error || !catalog) {
        if (process.env.NODE_ENV === "development") {
          const code = error && "code" in error ? String(error.code ?? "") : "";
          const message = error && "message" in error ? String(error.message) : "Unknown error";
          // Do not print URLs, tokens, or email addresses that may appear in provider errors.
          const safeMessage = message
            .replace(/https?:\/\/\S+/gi, "[URL removed]")
            .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
            .replace(/\b(?:bearer\s+|apikey[=: ]+)[^\s,;]+/gi, "[credential removed]")
            .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token removed]")
            .slice(0, 500);
          console.warn(
            `[catalog.refresh] table=${diagnostic?.table ?? "unknown"} status=${diagnostic?.status ?? "unknown"} code=${/^[A-Z0-9_]{1,40}$/.test(code) ? code : "unknown"} message=${safeMessage}`,
          );
        }
        const code =
          error && typeof error === "object" && "code" in error ? String(error.code) : "";
        const safeCode = /^[A-Z0-9_]{1,40}$/.test(code) ? ` (${code})` : "";
        throw new Error(
          `The live catalog could not be loaded${safeCode}. Check Supabase connectivity and public read access.`,
        );
      }
      return { catalog: { ...defaultCatalogState, ...catalog }, readAt: Date.now() };
    } catch (error) {
      reportServiceFailure("catalog.refresh", error);
      // Explicit failure result prevents Next from dumping the callback and cache key.
      // Never cache sample data or pretend an unavailable catalog is an empty store.
      return { catalog: null, readAt: Date.now() };
    }
  },
  ["public-catalog-v4"],
  { revalidate: 15 },
);

export const getPublicCatalog = cache(async (): Promise<CatalogState | null> => {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("The live catalog is not configured.");
      return null;
    }
    return defaultCatalogState;
  }

  // The live catalog must be read for an actual request, not embedded during a build.
  await connection();

  const { url, publishableKey } = getSupabaseConfig();
  try {
    const scope = createHash("sha256").update(`${url}\0${publishableKey}`).digest("hex");
    const result = await loadPublicCatalog(scope);
    if (result.catalog) {
      lastGood = { scope, catalog: result.catalog, readAt: result.readAt };
      return result.catalog;
    }
    // A short, bounded last-good fallback for this public catalog only.
    // Checkout still reads live prices and stock and does not use this fallback.
    if (lastGood?.scope === scope && Date.now() - lastGood.readAt < 300_000)
      return lastGood.catalog;
    return null;
  } catch (error) {
    reportServiceFailure("catalog.load", error);
    return null;
  }
});

/** Recheck a product against live public data when the short-lived catalog cache misses it. */
export async function getCurrentPublicProduct(slug: string) {
  if (!isSupabaseConfigured())
    return defaultCatalogState.products.find(
      (product) => product.slug === slug && product.status !== "draft",
    );
  const { url, publishableKey } = getSupabaseConfig();
  const { catalog, error } = await loadSupabaseCatalog(
    createSupabaseClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: fetchWithRetry },
    }),
  );
  if (error) return undefined;
  return catalog?.products.find((product) => product.slug === slug && product.status !== "draft");
}
