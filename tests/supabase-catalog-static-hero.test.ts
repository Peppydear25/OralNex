import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("../lib/supabase/config", () => ({
  getSupabaseConfig: () => ({ url: "https://example.supabase.co" }),
}));

import { loadSupabaseCatalog } from "../app/data/supabase-catalog";

function catalogClient(failProducts = false) {
  const from = vi.fn((table: string) => {
    if (table === "storefront_settings") throw new Error("Retired hero settings queried");
    const query = {
      select: () => query,
      order: () => query,
      eq: () => query,
      abortSignal: () => query,
      then(resolve: (value: unknown) => void) {
        resolve({
          data: [],
          error: failProducts && table === "products" ? { message: "Catalog unavailable" } : null,
        });
      },
    };
    return query;
  });
  return { client: { from } as unknown as SupabaseClient, from };
}

it("loads the catalog without fetching retired hero settings", async () => {
  const { client, from } = catalogClient();
  const result = await loadSupabaseCatalog(client);
  expect(result.error).toBeNull();
  expect(result.catalog).toEqual({ products: [], collections: [] });
  expect(from).not.toHaveBeenCalledWith("storefront_settings");
});

it("still reports product database errors", async () => {
  const { client } = catalogClient(true);
  const result = await loadSupabaseCatalog(client);
  expect(result.catalog).toBeNull();
  expect(result.error?.message).toBe("Catalog unavailable");
});
