"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { ActionResultModal, type ActionResult } from "../../components/action-result-modal";
import { LoadingIndicator } from "../../components/loading-indicator";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-16 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-[#08788c] focus:ring-4 focus:ring-cyan-50";

export function ResetPasswordPanel() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [recoveryState, setRecoveryState] = useState<"checking" | "valid" | "invalid">("checking");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      queueMicrotask(() => setRecoveryState("invalid"));
      return;
    }

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setRecoveryState(data.user ? "valid" : "invalid");
    });
  }, []);

  if (recoveryState !== "valid") {
    return (
      <div className="p-8 text-[#253138] max-sm:p-6">
        <div className="mx-auto w-full max-w-[430px]">
          <h1 className="text-3xl font-semibold leading-tight">
            {recoveryState === "checking" ? "Checking your reset link…" : "Reset link unavailable"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {recoveryState === "checking"
              ? "Please wait a moment."
              : "This link is invalid or expired. Request a new one to continue."}
          </p>
          {recoveryState === "invalid" && (
            <>
              <Link
                className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#08788c] px-5 font-bold text-white transition hover:bg-[#07697a]"
                href="/account/forgot-password"
              >
                Request a new link
              </Link>
              <Link
                className="mt-5 block text-center text-sm font-bold text-[#08788c]"
                href="/account"
              >
                Return to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password.length < 12 || password !== confirmation) {
      setResult({
        tone: "error",
        title: "Review your new password",
        message: password.length < 12 ? "Use at least 12 characters." : "Passwords do not match.",
      });
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setResult({
        tone: "error",
        title: "Your reset link could not be used",
        message: "Request a new reset link.",
      });
      return;
    }

    setResult({
      tone: "success",
      title: "Password changed",
      message: "Sign in with your new password.",
    });
  };

  const closeResult = () => {
    const completed = result?.tone === "success";
    setResult(null);
    if (completed) router.replace("/account");
  };

  return (
    <div className="p-8 text-[#253138] max-sm:p-6">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold leading-tight">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use at least 12 characters.</p>
        </header>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          {[
            { name: "password", label: "New password", autoComplete: "new-password" },
            { name: "confirmation", label: "Confirm new password", autoComplete: "new-password" },
          ].map((field) => (
            <label className="grid gap-2 text-sm font-semibold" key={field.name}>
              {field.label}
              <span className="relative block">
                <input
                  className={fieldClass}
                  name={field.name}
                  type={showPassword ? "text" : "password"}
                  autoComplete={field.autoComplete}
                  minLength={12}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#08788c]"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
          ))}
          <button
            className="mt-1 h-12 rounded-xl bg-[#08788c] font-bold text-white transition hover:bg-[#07697a]"
            type="submit"
            disabled={submitting}
          >
            {submitting ? <LoadingIndicator label="Updating…" /> : "Update password"}
          </button>
        </form>
      </div>
      <ActionResultModal result={result} onClose={closeResult} />
    </div>
  );
}
