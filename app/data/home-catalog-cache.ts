import { readStoredJson, writeStoredJson } from "../lib/browser-storage";
import { sanitizeCatalogState, type CatalogState } from "./catalog-state";

const STORAGE_KEY = "oralnex-public-home-catalog-v1";
export const HOME_CATALOG_CACHE_MS = 5 * 60_000;

export function readHomeCatalogCache(now = Date.now()) {
  return readStoredJson(
    STORAGE_KEY,
    (value) => {
      if (!value || typeof value !== "object") return null;
      const snapshot = value as Record<string, unknown>;
      if (
        snapshot.scope !== (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") ||
        typeof snapshot.savedAt !== "number" ||
        snapshot.savedAt > now ||
        now - snapshot.savedAt >= HOME_CATALOG_CACHE_MS
      )
        return null;
      const catalog = sanitizeCatalogState(snapshot.catalog);
      return catalog ? { catalog, expiresAt: snapshot.savedAt + HOME_CATALOG_CACHE_MS } : null;
    },
    null,
  );
}

/** Only call with data returned by the anonymous public catalog endpoint. */
export function writeHomeCatalogCache(catalog: CatalogState, now = Date.now()) {
  return writeStoredJson(STORAGE_KEY, {
    scope: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    savedAt: now,
    catalog,
  });
}
