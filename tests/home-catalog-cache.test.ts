import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultCatalogState } from "../app/data/catalog-state";
import {
  HOME_CATALOG_CACHE_MS,
  readHomeCatalogCache,
  writeHomeCatalogCache,
} from "../app/data/home-catalog-cache";

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://store.supabase.co");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("provides a recent public snapshot without waiting for the network", () => {
  expect(readHomeCatalogCache(1000)).toBeNull();
  writeHomeCatalogCache(defaultCatalogState, 1000);
  expect(readHomeCatalogCache(2000)?.catalog.products.length).toBe(
    defaultCatalogState.products.length,
  );
});

it("expires snapshots after five minutes and rejects future timestamps", () => {
  writeHomeCatalogCache(defaultCatalogState, 1000);
  expect(readHomeCatalogCache(1000 + HOME_CATALOG_CACHE_MS)).toBeNull();
  expect(readHomeCatalogCache(999)).toBeNull();
});

it("does not reuse a snapshot from another Supabase project", () => {
  writeHomeCatalogCache(defaultCatalogState, 1000);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://another.supabase.co");
  expect(readHomeCatalogCache(2000)).toBeNull();
});

it("continues safely when browser storage is blocked or corrupted", () => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => "broken json",
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    },
  });
  expect(readHomeCatalogCache()).toBeNull();
  expect(writeHomeCatalogCache(defaultCatalogState)).toBe(false);
});
