import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "test-key",
  }),
}));

const { getClaims, clientOptions } = vi.hoisted(() => ({
  getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }),
  clientOptions: {
    current: null as null | {
      cookies: {
        setAll: (
          items: Array<{ name: string; value: string; options?: { maxAge?: number } }>,
        ) => void;
      };
    },
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: typeof clientOptions.current) => {
    clientOptions.current = options;
    return { auth: { getClaims } };
  },
}));

import { updateSupabaseSession } from "../lib/supabase/proxy";
import {
  isExpiredBrowserSession,
  SESSION_ACTIVE_COOKIE,
  SESSION_ONLY_COOKIE,
} from "../lib/supabase/remember-me";

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: null }, error: null });
});

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
  expect(getClaims).not.toHaveBeenCalled();
});

it("clears invalid refresh token cookies from both the request and response", async () => {
  getClaims.mockResolvedValue({ data: null, error: { code: "refresh_token_not_found" } });
  const request = new NextRequest("https://oralnex.com/", {
    headers: { cookie: "sb-example-auth-token.0=stale; sb-example-auth-token.1=stale" },
  });
  const headers = new Headers(request.headers);
  const response = await updateSupabaseSession(request, headers);
  expect(headers.get("cookie")).not.toContain("sb-example-auth-token");
  expect(response.cookies.get("sb-example-auth-token.0")?.value).toBe("");
  expect(response.cookies.get("sb-example-auth-token.1")?.value).toBe("");
});

it("keeps the session when Supabase is temporarily unavailable", async () => {
  getClaims.mockResolvedValue({ data: null, error: { code: "network_error" } });
  const request = new NextRequest("https://oralnex.com/", {
    headers: { cookie: "sb-example-auth-token=token" },
  });
  const response = await updateSupabaseSession(request);
  expect(response.cookies.get("sb-example-auth-token")).toBeUndefined();
});

it("forwards refreshed cookies to the page as well as the browser", async () => {
  getClaims.mockImplementation(async () => {
    clientOptions.current!.cookies.setAll([{ name: "sb-example-auth-token", value: "refreshed" }]);
    return { data: { claims: {} }, error: null };
  });
  const request = new NextRequest("https://oralnex.com/", {
    headers: { cookie: "sb-example-auth-token=old" },
  });
  const headers = new Headers(request.headers);
  const response = await updateSupabaseSession(request, headers);
  expect(headers.get("cookie")).toContain("sb-example-auth-token=refreshed");
  expect(response.cookies.get("sb-example-auth-token")?.value).toBe("refreshed");
});
