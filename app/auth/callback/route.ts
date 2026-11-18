import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { authenticationDestination, safeBuyerPath } from "../../lib/navigation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedPath = requestUrl.searchParams.get("next");
  const nextPath = safeBuyerPath(
    requestedPath,
    type === "recovery" ? "/account/reset-password" : "/account/dashboard",
  );

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/account?authError=invalid_callback", requestUrl.origin));
  }

  // Supabase's default email service can return an implicit-flow session in the URL fragment.
  // Fragments never reach the server, so let the browser-side completion page consume it.
  if (!code && !(tokenHash && type)) {
    const completionUrl = new URL("/auth/complete", requestUrl.origin);
    completionUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(completionUrl);
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
  if (error) {
    // A confirmation URL is single-use. If the browser already has the valid
    // session created by its first visit, do not replace that success with a
    // misleading expired-link message when the URL is revisited.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const destination = authenticationDestination(nextPath, claimsData?.claims?.user_role);
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
    return NextResponse.redirect(
      new URL("/account?authError=expired_or_invalid_link", requestUrl.origin),
    );
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  return NextResponse.redirect(
    new URL(authenticationDestination(nextPath, claimsData?.claims?.user_role), requestUrl.origin),
  );
}
