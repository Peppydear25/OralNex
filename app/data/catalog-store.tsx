"use client";

import { usePathname } from "next/navigation";
import { fetchWithTimeout } from "../../lib/network/fetch-with-timeout";
import { writeHomeCatalogCache } from "./home-catalog-cache";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readStoredJson, writeStoredJson } from "../lib/browser-storage";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { toError } from "../../lib/errors/to-error";
import type { Collection, Product } from "./catalog";
import { defaultCatalogState, sanitizeCatalogState, type CatalogState } from "./catalog-state";
import { CatalogErrorGate, CatalogLoadingGate } from "./catalog-gate";

type CatalogContextValue = CatalogState & {
  catalogLoading: boolean;
  catalogError: boolean;
  retryCatalog: () => void;
  saveProduct: (product: Product) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  saveCollection: (
    collection: Collection,
    previousSlug?: string,
    productIds?: number[],
  ) => Promise<void>;
  removeCollection: (slug: string) => Promise<void>;
};

const STORAGE_KEY = "otm-storefront-catalog-v5";

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  children,
  initialCatalog,
}: {
  children: React.ReactNode;
  initialCatalog?: Partial<CatalogState>;
}) {
  const pathname = usePathname();
  const homeRoute = pathname === "/";
  const configured = isSupabaseConfigured() || process.env.NODE_ENV === "production";
  const [state, setState] = useState<CatalogState>({
    ...(configured ? { products: [], collections: [] } : defaultCatalogState),
    ...initialCatalog,
  });
  const [hydrated, setHydrated] = useState(Boolean(initialCatalog));
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const refreshLiveCatalog = async () => {
    const { loadSupabaseCatalog } = await import("./supabase-catalog");
    const { catalog, error } = await loadSupabaseCatalog();
    if (error || !catalog) throw toError(error, "The live catalog could not be loaded.");
    setState((current) => ({ ...current, ...catalog }));
  };
  useEffect(() => {
    if (configured) {
      if (initialCatalog) return;
      let active = true;
      const controller = new AbortController();
      const load = async () => {
        if (pathname === "/admin") {
          const { loadSupabaseCatalog } = await import("./supabase-catalog");
          return loadSupabaseCatalog();
        }
        const response = await fetchWithTimeout("/api/catalog", {
          cache: loadAttempt > 0 ? "reload" : "default",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("The catalog is unavailable.");
        const catalog = sanitizeCatalogState(await response.json());
        if (!catalog) throw new Error("The catalog could not be loaded.");
        writeHomeCatalogCache(catalog);
        return { catalog, error: null };
      };
      void load()
        .catch(() => ({ catalog: null, error: new Error("Catalog unavailable") }))
        .then(({ catalog, error }) => {
          if (!active) return;
          if (catalog) {
            setState((current) => ({ ...current, ...catalog }));
            setLoadError(false);
          } else if (error) {
            console.warn("The live catalog could not be loaded.");
            setLoadError(true);
          }
          setHydrated(true);
        });
      return () => {
        active = false;
        controller.abort();
      };
    }

    const parsed = readStoredJson(STORAGE_KEY, sanitizeCatalogState, null);
    queueMicrotask(() => {
      if (parsed) setState(parsed);
      setHydrated(true);
    });
  }, [configured, initialCatalog, loadAttempt, pathname]);
  useEffect(() => {
    if (hydrated && !configured) {
      if (!writeStoredJson(STORAGE_KEY, state)) {
        console.warn("Browser storage is full. Catalog changes could not be saved locally.");
      }
    }
  }, [state, hydrated, configured]);
  const value = useMemo<CatalogContextValue>(
    () => ({
      ...state,
      catalogLoading: !hydrated,
      catalogError: configured && loadError,
      retryCatalog: () => {
        setLoadError(false);
        setHydrated(false);
        setLoadAttempt((attempt) => attempt + 1);
      },
      saveProduct: async (product) => {
        if (isSupabaseConfigured()) {
          const { saveAdminProduct } = await import("./supabase-admin-catalog");
          await saveAdminProduct(product, state.collections);
          await refreshLiveCatalog();
          return;
        }
        setState((current) => ({
          ...current,
          products: current.products.some((item) => item.id === product.id)
            ? current.products.map((item) => (item.id === product.id ? product : item))
            : [product, ...current.products],
        }));
      },
      removeProduct: async (id) => {
        if (isSupabaseConfigured()) {
          const { deleteAdminProduct } = await import("./supabase-admin-catalog");
          const product = state.products.find((item) => item.id === id);
          if (!product) throw new Error("Product not found.");
          await deleteAdminProduct(product);
          await refreshLiveCatalog();
          return;
        }
        setState((current) => ({
          ...current,
          products: current.products.filter((item) => item.id !== id),
        }));
      },
      saveCollection: async (collection, previousSlug, productIds = []) => {
        if (isSupabaseConfigured()) {
          const { saveAdminCollection } = await import("./supabase-admin-catalog");
          await saveAdminCollection(collection, state.products, productIds);
          await refreshLiveCatalog();
          return;
        }
        setState((current) => {
          const previousName = previousSlug
            ? current.collections.find((item) => item.slug === previousSlug)?.name
            : undefined;
          const fallback =
            current.collections.find((item) => item.slug !== previousSlug)?.name ?? collection.name;
          return {
            ...current,
            collections: previousSlug
              ? current.collections.map((item) => (item.slug === previousSlug ? collection : item))
              : [...current.collections, collection],
            products: current.products.map((product) =>
              productIds.includes(product.id)
                ? { ...product, category: collection.name }
                : previousName && product.category === previousName
                  ? { ...product, category: fallback }
                  : product,
            ),
          };
        });
      },
      removeCollection: async (slug) => {
        if (isSupabaseConfigured()) {
          const { deleteAdminCollection } = await import("./supabase-admin-catalog");
          const collection = state.collections.find((item) => item.slug === slug);
          if (!collection) throw new Error("Category not found.");
          await deleteAdminCollection(collection);
          await refreshLiveCatalog();
          return;
        }
        setState((current) => ({
          ...current,
          collections: current.collections.filter((item) => item.slug !== slug),
        }));
      },
    }),
    [state, hydrated, configured, loadError],
  );
  if (!homeRoute && !hydrated) return <CatalogLoadingGate />;
  if (!homeRoute && configured && loadError) {
    return (
      <CatalogErrorGate
        onRetry={() => {
          setLoadError(false);
          setHydrated(false);
          setLoadAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return value;
}
