import { afterEach, beforeEach, expect, it, vi } from "vitest";
afterEach(() => vi.useRealTimers());

vi.mock("server-only", () => ({}));
vi.mock("../lib/errors/report-service-failure", () => ({ reportServiceFailure: vi.fn() }));
const { load, createClient, cached, connection } = vi.hoisted(() => ({
  load: vi.fn(),
  createClient: vi.fn(() => ({ anonymous: true })),
  cached: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
  connection: vi.fn(),
}));
vi.mock("next/cache", () => ({ unstable_cache: cached }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("../lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "public-test-key",
  }),
}));
vi.mock("../app/data/supabase-catalog", () => ({ loadSupabaseCatalog: load }));
import { getPublicCatalog } from "../app/data/server-catalog";

beforeEach(() => {
  load.mockReset();
  createClient.mockClear();
});

it("caches only anonymous catalog reads with short revalidation", async () => {
  load.mockResolvedValue({ catalog: { products: [], collections: [] }, error: null });
  expect(await getPublicCatalog()).toMatchObject({ products: [], collections: [] });
  expect(cached).toHaveBeenCalledWith(expect.any(Function), ["public-catalog-v3"], {
    revalidate: 15,
  });
  expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: expect.any(Function) },
  });
  expect(load).toHaveBeenCalledWith({ anonymous: true });
});

it("returns an explicit failure without throwing into Next's background revalidator", async () => {
  load.mockResolvedValue({ catalog: null, error: new Error("unavailable") });
  const cachedRead = cached.mock.calls[0][0];
  await expect(cachedRead("scope")).resolves.toMatchObject({ catalog: null });
});

it("serves last-good data briefly, then fails closed during a continued outage", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T00:00:00Z"));
  load.mockResolvedValue({ catalog: { products: [], collections: [] }, error: null });
  const good = await getPublicCatalog();
  load.mockResolvedValue({ catalog: null, error: new Error("offline") });
  vi.setSystemTime(new Date("2026-10-06T00:01:00Z"));
  expect(await getPublicCatalog()).toEqual(good);
  vi.setSystemTime(new Date("2026-10-06T00:06:00Z"));
  expect(await getPublicCatalog()).toBeNull();
});
