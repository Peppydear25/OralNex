"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { ActionResultModal, type ActionResult } from "../../components/action-result-modal";
import { LoadingIndicator } from "../../components/loading-indicator";

type Phase = "credentials" | "enroll" | "verify";

export function AdminSignInForm({ signedOut = false }: { signedOut?: boolean }) {
  const router = useRouter();
  const initialSessionChecked = useRef(false);
  const [phase, setPhase] = useState<Phase>("credentials");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [redirectOnClose, setRedirectOnClose] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(
    signedOut
      ? {
          tone: "success",
          title: "You are signed out",
          message: "You are signed out.",
        }
      : null,
  );

  const fail = (title: string, message: string) => {
    setPending(false);
    setResult({ tone: "error", title, message });
  };

  const continueWithMfa = async () => {
    const supabase = createClient();
    const [{ data: claimsData }, { data: aalData }, { data: factors, error: factorsError }] =
      await Promise.all([
        supabase.auth.getClaims(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

    if (claimsData?.claims?.user_role !== "admin") {
      await supabase.auth.signOut();
      fail(
        "Administrator access denied",
        "This account is authenticated but has not been assigned an administrator role.",
      );
      return;
    }
    if (aalData?.currentLevel === "aal2") {
      setPending(false);
      setRedirectOnClose(true);
      setResult({
        tone: "success",
        title: "Signed in",
        message: "Verification complete.",
      });
      return;
    }
    if (factorsError) {
      fail("MFA could not be loaded", "Check your connection and try signing in again.");
      return;
    }

    const verifiedFactor = factors?.totp.find((factor) => factor.status === "verified");
    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
      setPhase("verify");
      setPending(false);
      return;
    }

    // An interrupted setup can leave an unusable unverified factor. It is
    // safe to remove because it has never completed an MFA challenge.
    const unverifiedTotpFactors =
      factors?.all.filter(
        (factor) => factor.factor_type === "totp" && factor.status === "unverified",
      ) ?? [];
    for (const factor of unverifiedTotpFactors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        fail(
          "Previous authenticator setup could not be cleared",
          "Sign out, sign in again, and restart authenticator setup.",
        );
        return;
      }
    }

    const { data: enrollment, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "OralNex administrator",
    });
    if (error) {
      const disabled = error.code === "mfa_totp_enroll_not_enabled";
      fail(
        disabled ? "Authenticator enrollment is disabled" : "Authenticator setup could not start",
        disabled
          ? "Enable TOTP enrollment in Supabase Authentication settings, then try again."
          : "Sign out, sign in again, and retry setup.",
      );
      return;
    }
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setSecret(enrollment.totp.secret);
    setPhase("enroll");
    setPending(false);
  };

  useEffect(() => {
    if (initialSessionChecked.current) return;
    initialSessionChecked.current = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void continueWithMfa();
    });
    // Run only when the sign-in page first hydrates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
    if (error) {
      fail(
        "Sign-in unsuccessful",
        "The email address or password is incorrect. Check your credentials and try again.",
      );
      return;
    }
    await continueWithMfa();
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      fail("Check the verification code", "Enter the current six-digit authenticator code.");
      return;
    }
    setPending(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      fail(
        "Verification unsuccessful",
        "The authenticator code is incorrect or expired. Enter the newest code and try again.",
      );
      return;
    }
    await continueWithMfa();
  };

  const closeResult = () => {
    const shouldRedirect = redirectOnClose && result?.tone === "success";
    setResult(null);
    if (shouldRedirect) {
      // Admin sign-in is standalone; a full load mounts the dashboard's catalog provider.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/admin?auth=signed-in");
    } else if (signedOut) {
      router.replace("/admin/sign-in");
    }
  };

  if (phase === "enroll" || phase === "verify") {
    return (
      <>
        <div className="grid min-w-0 gap-5">
          {phase === "enroll" && (
            <div className="grid justify-items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              {/* Supabase returns this QR code as a short-lived inline SVG data URI. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rounded-lg bg-white p-2"
                src={qrCode}
                alt="OralNex administrator authenticator QR code"
                width={190}
                height={190}
              />
              <div>
                <h2 className="font-semibold">Set up your authenticator</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Scan this code with your authenticator app, then enter the six-digit code below.
                </p>
              </div>
              <details className="w-full text-left text-xs text-slate-500">
                <summary className="cursor-pointer font-semibold">Cannot scan the QR code?</summary>
                <code className="mt-2 block break-all rounded-lg bg-white p-3">{secret}</code>
              </details>
            </div>
          )}
          {phase === "verify" && (
            <p className="text-sm text-slate-600">Enter the code from your authenticator app.</p>
          )}
          <form
            className="grid min-w-0 gap-4"
            onSubmit={verifyCode}
            onChange={() => {
              if (result?.tone === "error") setResult(null);
            }}
          >
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Six-digit code
              <input
                className="h-12 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-center text-xl tracking-[.3em] outline-none focus:border-[#0e96aa] focus:ring-4 focus:ring-cyan-100"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
              />
            </label>
            {result?.tone === "error" && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {result.message}
              </p>
            )}
            <button
              className="h-12 w-full min-w-0 rounded-xl bg-[#08788c] font-bold text-white transition hover:bg-[#076879] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 disabled:opacity-60"
              type="submit"
              disabled={pending}
            >
              {pending ? (
                <LoadingIndicator label="Verifying…" />
              ) : phase === "enroll" ? (
                "Finish secure setup"
              ) : (
                "Verify code"
              )}
            </button>
          </form>
        </div>
        <ActionResultModal
          result={result?.tone === "success" ? result : null}
          onClose={closeResult}
        />
      </>
    );
  }

  return (
    <>
      <form
        className="grid min-w-0 gap-5 [&_label]:grid [&_label]:min-w-0 [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_input]:h-12 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-4 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-[#0e96aa] [&_input]:focus:ring-4 [&_input]:focus:ring-cyan-100 [&>button]:h-12 [&>button]:w-full [&>button]:min-w-0 [&>button]:rounded-xl [&>button]:bg-[#08788c] [&>button]:font-bold [&>button]:text-white [&>button]:transition [&>button]:hover:bg-[#076879] [&>button]:focus-visible:outline-none [&>button]:focus-visible:ring-4 [&>button]:focus-visible:ring-cyan-200 [&>button]:disabled:opacity-60"
        onSubmit={signIn}
        onChange={() => {
          if (result?.tone === "error") setResult(null);
        }}
      >
        <label>
          Email address
          <input name="email" type="email" inputMode="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            required
          />
        </label>
        {result?.tone === "error" && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {result.message}
          </p>
        )}
        <button type="submit" disabled={pending}>
          {pending ? <LoadingIndicator label="Checking account…" /> : "Sign in"}
        </button>
      </form>
      <ActionResultModal
        result={result?.tone === "success" ? result : null}
        onClose={closeResult}
      />
    </>
  );
}
