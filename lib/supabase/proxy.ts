import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";
import { isExpiredBrowserSession, SESSION_ACTIVE_COOKIE, SESSION_ONLY_COOKIE } from "./remember-me";

export async function updateSupabaseSession(
  request: NextRequest,
  requestHeaders = request.headers,
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  // This endpoint always uses an anonymous client, so session refresh only adds latency.
  if (request.nextUrl.pathname === "/api/catalog") return response;
  if (!isSupabaseConfigured()) return response;

  const { url, publishableKey } = getSupabaseConfig();
  const authCookie = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const authCookieNames = () =>
    request.cookies
      .getAll()
      .map(({ name }) => name)
      .filter((name) => name === authCookie || name.startsWith(`${authCookie}.`));
  const clearCookies = (names: string[]) => {
    names.forEach((name) => request.cookies.delete(name));
    requestHeaders.set("cookie", request.cookies.toString());
    const previousCookies = response.cookies.getAll();
    response = NextResponse.next({ request: { headers: requestHeaders } });
    previousCookies.forEach((cookie) => response.cookies.set(cookie));
    names.forEach((name) => response.cookies.delete(name));
  };
  if (isExpiredBrowserSession(request.cookies)) {
    clearCookies([...authCookieNames(), SESSION_ACTIVE_COOKIE, SESSION_ONLY_COOKIE]);
  }
  if (!authCookieNames().length) return response;
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (options?.maxAge === 0) request.cookies.delete(name);
          else request.cookies.set(name, value);
        });
        requestHeaders.set("cookie", request.cookies.toString());
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request: { headers: requestHeaders } });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims verifies and refreshes the cookie-backed session when necessary.
  const { error } = await supabase.auth.getClaims();
  if (error?.code === "refresh_token_not_found")
    clearCookies([...authCookieNames(), SESSION_ACTIVE_COOKIE, SESSION_ONLY_COOKIE]);
  return response;
}
