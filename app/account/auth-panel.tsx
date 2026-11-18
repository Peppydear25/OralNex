"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { ActionResultModal, type ActionResult } from "../components/action-result-modal";
import { LoadingIndicator } from "../components/loading-indicator";
import { useBuyerAccount } from "../data/buyer-account-store";
import { safeBuyerPath } from "../lib/navigation";
import { getAuthErrorFeedback } from "./auth-error-feedback";
import { setBuyerSessionPreference } from "../../lib/supabase/remember-me";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] outline-none transition focus:border-[#08788c] focus:ring-4 focus:ring-cyan-50";

export function AuthPanel({
  returnTo = "/account/dashboard",
  initialError,
}: {
  returnTo?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const account = useBuyerAccount();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(
    initialError
      ? {
          tone: "error",
          title: "This sign-in link could not be used",
          message: "This link has expired or was used. Request a new one.",
        }
      : null,
  );
  const [redirectAfterResult, setRedirectAfterResult] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const changeMode = (value: "signin" | "register") => {
    setMode(value);
    setResult(null);
    setShowPassword(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const firstName = mode === "register" ? String(data.get("firstName") ?? "").trim() : "";
    const lastName = mode === "register" ? String(data.get("lastName") ?? "").trim() : "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      (mode === "register" && password.length < 12)
    ) {
      setResult({
        tone: "error",
        title: "We could not continue",
        message:
          mode === "signin"
            ? "Enter your email and password."
            : "Enter a valid email and a password of at least 12 characters.",
      });
      return;
    }
    if (mode === "register" && (!firstName || !lastName || data.get("terms") !== "on")) {
      setResult({
        tone: "error",
        title: "Complete your account details",
        message: "Enter your name and accept the Terms of Service.",
      });
      return;
    }
    setSubmitting(true);
    setRedirectAfterResult(false);
    setRedirectPath(null);

    if (!isSupabaseConfigured()) {
      setSubmitting(false);
      setResult({
        tone: "error",
        title: "Account service unavailable",
        message: "Please try again later.",
      });
      return;
    }

    {
      const supabase = createClient();
      const response =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { first_name: firstName, last_name: lastName },
                emailRedirectTo: `${window.location.origin}/auth/complete?next=/account/dashboard`,
              },
            });

      setSubmitting(false);
      if (response.error) {
        const feedback = getAuthErrorFeedback(mode, response.error.code);
        setResult({
          tone: "error",
          title: feedback.title,
          message: feedback.message,
        });
        return;
      }

      if (mode === "signin") setBuyerSessionPreference(data.get("remember") === "on");

      const { data: claimsData } = await supabase.auth.getClaims();
      if (claimsData?.claims?.user_role === "admin") {
        setBuyerSessionPreference(true);
        setSubmitting(false);
        setRedirectAfterResult(true);
        setRedirectPath("/admin/sign-in");
        setResult({
          tone: "success",
          title: "Administrator sign-in",
          message: "Continue to admin sign-in.",
        });
        return;
      }

      const registrationWasObfuscated =
        mode === "register" &&
        !response.data.session &&
        response.data.user?.identities?.length === 0;
      if (registrationWasObfuscated) {
        setResult({
          tone: "error",
          title: "This account may already exist",
          message: "Try signing in or resetting your password.",
        });
        return;
      }

      if (mode === "register" && !response.data.session) {
        setResult({
          tone: "success",
          title: "Check your inbox",
          message: "Check your email to verify your account.",
        });
        return;
      }

      const metadata = response.data.user?.user_metadata;
      account.signIn({
        firstName: String(metadata?.first_name || firstName || "Buyer"),
        lastName: String(metadata?.last_name || lastName),
        email: response.data.user?.email ?? email,
      });
    }

    setRedirectAfterResult(true);
    setRedirectPath(safeBuyerPath(returnTo));
    setResult({
      tone: "success",
      title: mode === "signin" ? "Welcome back" : "Your account is ready",
      message: mode === "signin" ? "You’re signed in." : "Your account is ready.",
    });
  };
  const closeResult = () => {
    const shouldRedirect = result?.tone === "success" && redirectAfterResult;
    setResult(null);
    if (shouldRedirect) router.push(redirectPath ?? "/account/dashboard");
  };

  return (
    <div className="flex flex-col justify-center px-8 text-[#253138] max-sm:px-6">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold leading-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
        </header>

        <form
          className="grid gap-4"
          onSubmit={submit}
          onChange={() => {
            if (result?.tone === "error") setResult(null);
          }}
          noValidate
        >
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <label className="grid gap-2 text-sm font-semibold">
                First name
                <input
                  className={fieldClass}
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Last name
                <input
                  className={fieldClass}
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              className={fieldClass}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <span className="relative block">
              <input
                className={`${fieldClass} pr-16`}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 12 : undefined}
                required
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#08788c]"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          {mode === "register" ? (
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
              <input
                className="mt-0.5 size-4 shrink-0 accent-[#08788c]"
                type="checkbox"
                name="terms"
                required
              />
              <span>
                I agree to the{" "}
                <Link
                  className="font-semibold text-[#08788c] underline underline-offset-2"
                  href="/terms-of-service"
                >
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link
                  className="font-semibold text-[#08788c] underline underline-offset-2"
                  href="/privacy-policy"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          ) : (
            <div className="flex items-center justify-between gap-4 text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input className="size-4 accent-[#08788c]" type="checkbox" name="remember" />
                Remember me
              </label>
              <Link
                className="font-semibold text-[#08788c] underline decoration-[#08788c]/35 underline-offset-4 transition hover:decoration-[#08788c]"
                href="/account/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
          )}
          {result?.tone === "error" && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg bg-[#fff4f2] px-3 py-2.5 text-[13px] leading-5 text-[#9f2e25]"
            >
              <span
                className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#d94b3f] text-[11px] font-bold leading-none text-white"
                aria-hidden="true"
              >
                !
              </span>
              <span>{result.message}</span>
            </div>
          )}
          <button
            className="mt-1 h-12 rounded-xl bg-[#08788c] font-bold text-white shadow-sm transition hover:bg-[#07697a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <LoadingIndicator label={mode === "signin" ? "Signing in…" : "Creating account…"} />
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          {mode === "signin" ? "Don’t have an account? " : "Already have an account? "}
          <button
            className="font-semibold text-[#08788c] underline underline-offset-4 hover:text-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
            type="button"
            onClick={() => changeMode(mode === "signin" ? "register" : "signin")}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
      <ActionResultModal
        result={result?.tone === "success" ? result : null}
        onClose={closeResult}
      />
    </div>
  );
}
