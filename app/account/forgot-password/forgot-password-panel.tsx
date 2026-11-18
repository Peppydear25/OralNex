"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { ActionResultModal, type ActionResult } from "../../components/action-result-modal";
import { LoadingIndicator } from "../../components/loading-indicator";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] outline-none transition placeholder:text-[13px] placeholder:font-normal placeholder:text-slate-400 focus:border-[#08788c] focus:ring-4 focus:ring-cyan-50";

export function ForgotPasswordPanel() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setResult({
        tone: "error",
        title: "Check your email address",
        message: "Enter a valid email address.",
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      setResult({
        tone: "error",
        title: "Password recovery is unavailable",
        message: "Please try again later.",
      });
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/complete?next=/account/reset-password`,
    });
    setSubmitting(false);

    setResult({
      tone: "success",
      title: "Check your inbox",
      message: "If an account exists for this email, we’ll send you a reset link.",
    });
    form.reset();
  };

  return (
    <div className="p-8 text-[#253138] max-sm:p-6">
      <div className="mx-auto w-full max-w-[430px]">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-[#08788c] hover:underline"
          href="/account"
        >
          <span aria-hidden="true">←</span> Back to sign in
        </Link>
        <header className="mb-6 mt-7">
          <h1 className="text-3xl font-semibold leading-tight">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your email to receive a reset link.
          </p>
        </header>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              className={fieldClass}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              required
            />
          </label>
          <button
            className="h-12 rounded-xl bg-[#08788c] px-5 font-bold text-white shadow-sm transition hover:bg-[#07697a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
            type="submit"
            disabled={submitting}
          >
            {submitting ? <LoadingIndicator label="Sending…" /> : "Send reset instructions"}
          </button>
        </form>
      </div>
      <ActionResultModal result={result} onClose={() => setResult(null)} />
    </div>
  );
}
