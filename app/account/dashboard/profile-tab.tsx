import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import type { BuyerAccount } from "../../data/buyer-account-store";
import { LoadingIndicator } from "../../components/loading-indicator";
import { normalizeUSPhone, US_PHONE_ERROR } from "../../../lib/us-phone";
import { USPhoneInput } from "../../components/us-phone-input";

export function ProfileTab({
  buyer,
  notify,
  onUpdate,
}: {
  buyer: BuyerAccount;
  notify: (message: string) => void;
  onUpdate: (buyer: BuyerAccount) => void;
}) {
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawPhone = String(data.get("phone") ?? "").trim();
    if (rawPhone && !normalizeUSPhone(rawPhone)) {
      notify(US_PHONE_ERROR);
      return;
    }
    const nextBuyer = {
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      email: buyer.email,
      phone: rawPhone ? normalizeUSPhone(rawPhone)! : "",
    };
    if (!nextBuyer.firstName || !nextBuyer.lastName) {
      notify("Enter your first and last name before saving.");
      return;
    }

    setSaving(true);
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setSaving(false);
        notify("Your session has expired. Sign in again before updating your profile.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: nextBuyer.firstName,
          last_name: nextBuyer.lastName,
          phone: nextBuyer.phone || null,
        })
        .eq("id", userData.user.id);
      if (profileError) {
        setSaving(false);
        notify("Your profile could not be updated. Please try again.");
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: nextBuyer.firstName,
          last_name: nextBuyer.lastName,
          phone: nextBuyer.phone,
        },
      });
      if (authError) {
        setSaving(false);
        notify("Your profile details were saved, but account metadata could not be synchronized.");
        onUpdate({ ...buyer, ...nextBuyer });
        return;
      }
    }
    setSaving(false);
    onUpdate({ ...buyer, ...nextBuyer });
    notify("Profile updated.");
  };

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-6 py-4 max-sm:px-5">
          <h2 className="text-lg font-semibold">Personal information</h2>
        </header>
        <form
          className="grid grid-cols-2 gap-4 p-6 max-sm:grid-cols-1 max-sm:p-5 [&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_input]:h-12 [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:px-4 [&_input]:outline-none [&_input]:transition focus-within:[&_input]:border-[#08788c] focus-within:[&_input]:ring-4 focus-within:[&_input]:ring-cyan-50"
          onSubmit={submit}
        >
          <label>
            First name
            <input
              name="firstName"
              defaultValue={buyer.firstName}
              autoComplete="given-name"
              maxLength={80}
              required
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              defaultValue={buyer.lastName}
              autoComplete="family-name"
              maxLength={80}
              required
            />
          </label>
          <label className="col-span-2 max-sm:col-span-1">
            Phone number <span className="font-normal text-slate-400">(optional)</span>
            <USPhoneInput defaultValue={buyer.phone} required={false} />
          </label>
          <div className="col-span-2 pt-1 max-sm:col-span-1">
            <button
              className="rounded-lg bg-[#08788c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#07697a] disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={saving}
            >
              {saving ? <LoadingIndicator label="Saving…" /> : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 max-sm:p-5">
        <h2 className="text-lg font-semibold">Sign-in &amp; security</h2>
        <div className="mt-4 min-w-0">
          <p className="text-xs font-semibold text-slate-500">Email address</p>
          <p className="mt-1 break-all text-sm font-medium text-slate-900">{buyer.email}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-900">Password</p>
          <Link
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#08788c] transition hover:border-[#08788c]"
            href="/account/forgot-password"
          >
            Reset password
          </Link>
        </div>
      </section>
    </div>
  );
}
