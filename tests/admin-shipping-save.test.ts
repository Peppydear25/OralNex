import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), schema: vi.fn(), read: vi.fn() }));
vi.mock("../lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ limit: mocks.schema, eq: () => ({ single: mocks.read }) }) }),
  }),
}));
import { saveAdminProduct } from "../app/data/supabase-admin-catalog";
import { products } from "../app/data/catalog";
import {
  measuredPackagesDraft,
  newMeasuredPackage,
  parsePackageSize,
  poundsToKg,
} from "../lib/shipping/measured-packages";
import { emptyAutomaticPacking } from "../lib/shipping/automatic-packing";

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
const product = { ...products[0], shippingProfiles: profiles };
const categories = [
  {
    name: product.category,
    databaseId: "category-id",
    slug: "masks",
    description: "",
    image: "/logo.jpg",
  },
];
afterEach(() => vi.resetAllMocks());

it("blocks writes with an actionable message when the migration is missing", async () => {
  mocks.schema.mockResolvedValue({ error: { code: "42703" } });
  await expect(saveAdminProduct(product, categories)).rejects.toThrow(
    "202610090003_simple_shipping_capacity.sql",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("sends profiles and verifies their saved values regardless of JSON key order", async () => {
  mocks.schema.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "product-id", error: null });
  mocks.read.mockResolvedValue({
    data: {
      automatic_packing: emptyAutomaticPacking,
      shipping_package_profiles: profiles.map((p) =>
        Object.fromEntries(Object.entries(p).reverse()),
      ),
    },
    error: null,
  });
  await expect(saveAdminProduct(product, categories)).resolves.toBe("product-id");
  expect(mocks.rpc).toHaveBeenCalledWith(
    "admin_save_product",
    expect.objectContaining({
      payload: expect.objectContaining({ shipping_package_profiles: profiles }),
    }),
  );
});

it("does not report success if an old RPC ignores package profiles", async () => {
  mocks.schema.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "product-id", error: null });
  mocks.read.mockResolvedValue({ data: { shipping_package_profiles: [] }, error: null });
  await expect(saveAdminProduct(product, categories)).rejects.toThrow(
    "shipping profiles were not stored correctly",
  );
});

it("distinguishes an uncertain read-back from a failed save", async () => {
  mocks.schema.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "product-id", error: null });
  mocks.read.mockResolvedValue({ data: null, error: { code: "NETWORK" } });
  await expect(saveAdminProduct(product, categories)).rejects.toThrow(
    "avoid creating a duplicate product",
  );
});

it("rejects success if automatic packing was silently dropped", async () => {
  mocks.schema.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "product-id", error: null });
  mocks.read.mockResolvedValue({ data: { shipping_package_profiles: profiles }, error: null });
  await expect(saveAdminProduct(product, categories)).rejects.toThrow(
    "automatic packing was not stored correctly",
  );
});

it("stores and reads back the new measured-package strategy without dropping its units", async () => {
  const packing = {
    ...measuredPackagesDraft(emptyAutomaticPacking),
    verified: true,
    units: [{ variantSku: "", weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 }],
    cartons: [
      {
        ...newMeasuredPackage("", 1),
        ...parsePackageSize("13 x 8 x 4")!,
        grossWeightBySku: { "": poundsToKg(2.51) },
      },
    ],
  };
  mocks.schema.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "product-id", error: null });
  mocks.read.mockResolvedValue({
    data: {
      automatic_packing: JSON.parse(JSON.stringify(packing)),
      shipping_package_profiles: profiles,
    },
    error: null,
  });
  await expect(
    saveAdminProduct({ ...product, variants: undefined, automaticPacking: packing }, categories),
  ).resolves.toBe("product-id");
  expect(mocks.rpc).toHaveBeenCalledWith(
    "admin_save_product",
    expect.objectContaining({ payload: expect.objectContaining({ automatic_packing: packing }) }),
  );
});
