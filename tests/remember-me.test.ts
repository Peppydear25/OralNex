import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "test-key",
  }),
}));

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getClaims } }) }));

import { updateSupabaseSession } from "../lib/supabase/proxy";
import {
  isExpiredBrowserSession,
  SESSION_ACTIVE_COOKIE,
  SESSION_ONLY_COOKIE,
} from "../lib/supabase/remember-me";

it("recognizes a browser-only session after its session cookie disappears", () => {
  const cookies = new Map([[SESSION_ONLY_COOKIE, "1"]]);
  const get = (name: string) => {
    const value = cookies.get(name);
    return value ? { value } : undefined;
  };
  expect(isExpiredBrowserSession({ get })).toBe(true);
  cookies.set(SESSION_ACTIVE_COOKIE, "1");
  expect(isExpiredBrowserSession({ get })).toBe(false);
});

it("clears stale auth cookies before the app receives the request", async () => {
  const request = new NextRequest("https://oralnex.com/account/dashboard", {
    headers: {
      cookie: `${SESSION_ONLY_COOKIE}=1; sb-example-auth-token.0=token; sb-example-auth-token.1=token`,
    },
  });
  const requestHeaders = new Headers(request.headers);
  const response = await updateSupabaseSession(request, requestHeaders);
  expect(requestHeaders.get("cookie")).not.toContain("sb-example-auth-token");
  expect(response.cookies.get("sb-example-auth-token.0")?.value).toBe("");
  expect(response.cookies.get(SESSION_ONLY_COOKIE)?.value).toBe("");
  expect(getClaims).toHaveBeenCalled();
});
