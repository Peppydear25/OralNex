import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";
import { isExpiredBrowserSession, SESSION_ACTIVE_COOKIE, SESSION_ONLY_COOKIE } from "./remember-me";

export async function updateSupabaseSession(
  request: NextRequest,
  requestHeaders = request.headers,
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!isSupabaseConfigured()) return response;

  const { url, publishableKey } = getSupabaseConfig();
  if (isExpiredBrowserSession(request.cookies)) {
    const authCookie = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    const names = request.cookies
      .getAll()
      .map(({ name }) => name)
      .filter(
        (name) =>
          name === authCookie ||
          name.startsWith(`${authCookie}.`) ||
          name === SESSION_ACTIVE_COOKIE ||
          name === SESSION_ONLY_COOKIE,
      );
    names.forEach((name) => request.cookies.delete(name));
    requestHeaders.set("cookie", request.cookies.toString());
    response = NextResponse.next({ request: { headers: requestHeaders } });
    names.forEach((name) => response.cookies.delete(name));
  }
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims verifies and refreshes the cookie-backed session when necessary.
  await supabase.auth.getClaims();
  return response;
}
