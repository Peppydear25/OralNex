import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "./lib/supabase/proxy";
import { contentSecurityPolicy } from "./lib/security/content-security-policy";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-oralnex-pathname", request.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = await updateSupabaseSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
