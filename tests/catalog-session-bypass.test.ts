import { NextRequest } from "next/server";
import { expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: createClient }));
vi.mock("../lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({ url: "https://store.supabase.co", publishableKey: "test" }),
}));
import { updateSupabaseSession } from "../lib/supabase/proxy";

it("serves the anonymous catalog without waiting for a signed-in session refresh", async () => {
  const request = new NextRequest("https://oralnex.example/api/catalog", {
    headers: { cookie: "sb-store-auth-token=test-session" },
  });
  const response = await updateSupabaseSession(request);
  expect(response.status).toBe(200);
  expect(createClient).not.toHaveBeenCalled();
  expect(response.headers.get("set-cookie")).toBeNull();
});
