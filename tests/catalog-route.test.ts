import { beforeEach, expect, it, vi } from "vitest";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../app/data/server-catalog", () => ({ getPublicCatalog: load }));
import { GET } from "../app/api/catalog/route";

beforeEach(() => load.mockReset());

it("returns public catalog data, including the server's recent cached fallback", async () => {
  const catalog = { products: [], collections: [] };
  load.mockResolvedValue(catalog);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(catalog);
  expect(response.headers.get("Cache-Control")).toBe(
    "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
  );
});

it("returns a retryable service error when no recent catalog is available", async () => {
  load.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ error: "Catalog unavailable" });
});
