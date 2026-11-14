import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("../lib/supabase/config", () => ({
  getSupabaseConfig: () => ({ url: "https://example.supabase.co" }),
}));

import { loadSupabaseCatalog } from "../app/data/supabase-catalog";

function catalogClient(settingsError: { code: string; message: string }) {
  const selections: string[] = [];
  const client = {
    from(table: string) {
      let columns = "";
      const query = {
        select(value: string) {
          columns = value;
          if (table === "storefront_settings") selections.push(value);
          return query;
        },
        order() {
          return query;
        },
        eq() {
          return query;
        },
        abortSignal() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve(
            columns.includes("hero_slides")
              ? { data: null, error: settingsError }
              : {
                  data: {
                    hero_images: ["/legacy-hero.jpg"],
                    hero_eyebrow: "OralNex",
                    hero_title: "Welcome",
                    bulk_product_ids: [],
                  },
                  error: null,
                },
          );
        },
        then(resolve: (value: { data: never[]; error: null }) => void) {
          resolve({ data: [], error: null });
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, selections };
}

it("loads legacy hero images only when hero_slides is missing", async () => {
  const { client, selections } = catalogClient({
    code: "42703",
    message: "column storefront_settings.hero_slides does not exist",
  });
  const result = await loadSupabaseCatalog(client);
  expect(result.error).toBeNull();
  expect(result.catalog?.merchandising?.heroSlides).toEqual([
    {
      desktopImage: "/legacy-hero.jpg",
      mobileImage: "/legacy-hero.jpg",
      alt: "OralNex featured medical supplies 1",
      published: true,
    },
  ]);
  expect(selections).toHaveLength(2);
  expect(selections[1]).not.toContain("hero_slides");
});

it("does not hide unrelated database errors", async () => {
  const { client, selections } = catalogClient({
    code: "42703",
    message: "column storefront_settings.bulk_product_ids does not exist",
  });
  const result = await loadSupabaseCatalog(client);
  expect(result.catalog).toBeNull();
  expect(result.error?.message).toContain("bulk_product_ids");
  expect(selections).toHaveLength(1);
});
