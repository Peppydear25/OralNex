"use client";

import { useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import { safeBuyerPath } from "../../lib/navigation";

export default function CompleteAuthenticationPage() {
  useEffect(() => {
    const completeAuthentication = async () => {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const nextPath = safeBuyerPath(query.get("next"));
      const code = query.get("code");
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const supabase = createClient();

      const result =
        accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("The authentication response did not contain a valid session.") };

      window.history.replaceState(null, "", window.location.pathname);
      if (result.error) {
        // Confirmation and recovery links are single-use. A repeated link can
        // report an OTP error even though its first visit already established
        // a valid session in this browser.
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: claimsData } = await supabase.auth.getClaims();
          // This standalone callback must reload the destination's provider tree.
          window.location.replace(
            claimsData?.claims?.user_role === "admin" ? "/admin/sign-in" : nextPath,
          );
          return;
        }
        window.location.replace("/account?authError=expired_or_invalid_link");
        return;
      }

      const { data: claimsData } = await supabase.auth.getClaims();
      window.location.replace(
        claimsData?.claims?.user_role === "admin" ? "/admin/sign-in" : nextPath,
      );
    };

    void completeAuthentication();
  }, []);

  return (
    <main
      className="grid min-h-[50vh] place-items-center px-5 text-center"
      role="status"
      aria-live="polite"
    >
      <div>
        <span
          className="mx-auto block size-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0a8d99] motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="mt-4 font-semibold text-[#253138]">Completing sign-in…</p>
      </div>
    </main>
  );
}
