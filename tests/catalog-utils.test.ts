import { describe, expect, it } from "vitest";
import { slugify } from "../app/admin/dashboard/utils";
import { defaultCatalogState, sanitizeCatalogState } from "../app/data/catalog-state";

describe("catalog utilities", () => {
  it("loads categories without descriptions and discards legacy descriptions", () => {
    const state = {
      ...defaultCatalogState,
      collections: defaultCatalogState.collections.map((collection) => ({
        ...collection,
        description: "Retired category copy",
      })),
    };
    const result = sanitizeCatalogState(state);
    expect(result?.collections).toEqual(defaultCatalogState.collections);
    expect(result?.collections[0]).not.toHaveProperty("description");
  });
  it("retains automatic packing across browser reloads", () => {
    const automaticPacking = {
      verified: false,
      units: [{ variantSku: "BLUE", weightKg: 0.2, lengthCm: 10, widthCm: 5, heightCm: 2 }],
      cartons: [],
    };
    const state = {
      ...defaultCatalogState,
      products: [{ ...defaultCatalogState.products[0], automaticPacking }],
    };
    expect(
      sanitizeCatalogState(JSON.parse(JSON.stringify(state)))?.products[0].automaticPacking,
    ).toEqual(automaticPacking);
  });
  it("preserves package profiles when browser storage reloads", () => {
    const profiles = [
      {
        name: "Carton",
        variantSku: "BLUE",
        boxes: 40,
        weightKg: 9.4,
        lengthCm: 52,
        widthCm: 39,
        heightCm: 34,
        verified: true,
      },
    ];
    const state = {
      ...defaultCatalogState,
      products: [{ ...defaultCatalogState.products[0], shippingProfiles: profiles }],
    };
    expect(
      sanitizeCatalogState(JSON.parse(JSON.stringify(state)))?.products[0].shippingProfiles,
    ).toEqual(profiles);
  });
  it("creates predictable URL-safe slugs", () => {
    expect(slugify("  Blood Pressure & Diagnostics ")).toBe("blood-pressure-diagnostics");
  });

  it("rejects malformed persisted catalog state", () => {
    expect(sanitizeCatalogState({ products: "not-an-array", collections: [] })).toBeNull();
  });

  it("accepts the trusted default catalog", () => {
    expect(sanitizeCatalogState(defaultCatalogState)?.products.length).toBe(
      defaultCatalogState.products.length,
    );
  });

  it("preserves database product IDs when sanitizing the public catalog for checkout", () => {
    const databaseId = "00000000-0000-4000-8000-000000000001";
    const state = {
      ...defaultCatalogState,
      products: [{ ...defaultCatalogState.products[0], databaseId }],
    };

    expect(sanitizeCatalogState(JSON.parse(JSON.stringify(state)))?.products[0].databaseId).toBe(
      databaseId,
    );
    expect(
      sanitizeCatalogState({
        ...state,
        products: [{ ...state.products[0], databaseId: "not-a-uuid" }],
      })?.products[0].databaseId,
    ).toBeUndefined();
  });
});
