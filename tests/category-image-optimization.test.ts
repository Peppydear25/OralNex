import { afterEach, expect, it, vi } from "vitest";
import { canOptimizeCategoryImage } from "../app/components/category-image";

afterEach(() => vi.unstubAllEnvs());

it("optimizes local and allowlisted public Supabase images", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://store.supabase.co");
  expect(canOptimizeCategoryImage("/hero.webp")).toBe(true);
  expect(
    canOptimizeCategoryImage(
      "https://store.supabase.co/storage/v1/object/public/product-media/gloves.jpg",
    ),
  ).toBe(true);
});

it("keeps other supported external URLs outside the optimizer allowlist", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://store.supabase.co");
  expect(canOptimizeCategoryImage("https://other.example/gloves.jpg")).toBe(false);
  expect(canOptimizeCategoryImage("//other.example/gloves.jpg")).toBe(false);
  expect(
    canOptimizeCategoryImage("https://store.supabase.co/storage/v1/object/public/other/gloves.jpg"),
  ).toBe(false);
  expect(
    canOptimizeCategoryImage(
      "https://store.supabase.co/storage/v1/object/public/product-media/gloves.jpg?token=test",
    ),
  ).toBe(false);
});

it("handles missing configuration and data URLs without breaking image rendering", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect(canOptimizeCategoryImage("https://other.example/gloves.jpg")).toBe(false);
  expect(canOptimizeCategoryImage("data:image/png;base64,test")).toBe(false);
  expect(canOptimizeCategoryImage("/logo.jpg")).toBe(true);
});
