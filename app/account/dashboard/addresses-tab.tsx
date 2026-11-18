"use client";

import { FormEvent, useState } from "react";
import type { ShippingAddress } from "../../data/buyer-account-store";
import {
  removeShippingAddress,
  saveShippingAddress,
  setDefaultShippingAddress,
} from "../../data/supabase-addresses";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { ADDRESS_LIMIT_MESSAGE, MAX_SAVED_ADDRESSES } from "../../data/address-limit";
import { US_STATES } from "../../checkout/us-states";
import { LoadingIndicator } from "../../components/loading-indicator";
import { formatAddressText } from "../../checkout/format-address-text";

type Props = {
  addresses: ShippingAddress[];
  onChange: (addresses: ShippingAddress[]) => void;
  notify: (message: string) => void;
};

const fieldClass =
  "h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-[#0a8d99] focus:ring-3 focus:ring-[#0a8d99]/10";

export function AddressesTab({ addresses, onChange, notify }: Props) {
  const [editing, setEditing] = useState<ShippingAddress | null | "new">(null);
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const previous = editing === "new" ? undefined : editing;
    if (!previous && addresses.length >= MAX_SAVED_ADDRESSES) {
      notify(ADDRESS_LIMIT_MESSAGE);
      setEditing(null);
      return;
    }
    const address: ShippingAddress = {
      id: previous?.id ?? `address-${Date.now()}`,
      label: String(data.get("label") ?? "Shipping address").trim(),
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      company: String(data.get("company") ?? "").trim() || undefined,
      address1: formatAddressText(String(data.get("address1") ?? "").trim()),
      address2: String(data.get("address2") ?? "").trim() || undefined,
      city: formatAddressText(String(data.get("city") ?? "").trim()),
      state: String(data.get("state") ?? ""),
      postalCode: String(data.get("postalCode") ?? "").trim(),
      isDefault: previous?.isDefault ?? addresses.length === 0,
    };
    let savedAddress = address;
    setSaving(true);
    if (isSupabaseConfigured()) {
      const result = await saveShippingAddress(address);
      if (result.error || !result.address) {
        setSaving(false);
        notify(
          result.error?.message === ADDRESS_LIMIT_MESSAGE
            ? ADDRESS_LIMIT_MESSAGE
            : "The shipping address could not be saved. Please try again.",
        );
        return;
      }
      savedAddress = result.address;
    }
    onChange(
      previous
        ? addresses.map((item) => (item.id === previous.id ? savedAddress : item))
        : [...addresses, savedAddress],
    );
    setSaving(false);
    setEditing(null);
    notify(previous ? "Shipping address updated." : "Shipping address saved.");
  };

  const remove = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await removeShippingAddress(id);
      if (error) {
        notify("The shipping address could not be removed. Please try again.");
        return;
      }
    }
    const remaining = addresses.filter((address) => address.id !== id);
    if (remaining.length && !remaining.some((address) => address.isDefault)) {
      if (isSupabaseConfigured()) await setDefaultShippingAddress(remaining[0].id);
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    onChange(remaining);
    notify("Shipping address removed.");
  };

  const makeDefault = async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await setDefaultShippingAddress(id);
      if (error) {
        notify("The default address could not be changed. Please try again.");
        return;
      }
    }
    onChange(addresses.map((address) => ({ ...address, isDefault: address.id === id })));
    notify("Default checkout address updated.");
  };

  if (editing) {
    const value = editing === "new" ? undefined : editing;
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-6 max-sm:p-5">
          <h2 className="text-lg font-semibold">{value ? "Edit address" : "Add address"}</h2>
          <p className="mt-1 text-sm text-slate-500">This information can prefill checkout.</p>
        </header>
        <form onSubmit={save}>
          <div className="grid grid-cols-2 gap-4 p-6 max-sm:grid-cols-1 max-sm:p-5 [&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold">
            <label className="col-span-2 max-sm:col-span-1">
              Address label
              <input
                className={fieldClass}
                name="label"
                defaultValue={value?.label}
                placeholder="Home or workplace"
                required
              />
            </label>
            <label>
              First name
              <input
                className={fieldClass}
                name="firstName"
                defaultValue={value?.firstName}
                autoComplete="given-name"
                required
              />
            </label>
            <label>
              Last name
              <input
                className={fieldClass}
                name="lastName"
                defaultValue={value?.lastName}
                autoComplete="family-name"
                required
              />
            </label>
            <label className="col-span-2 max-sm:col-span-1">
              Company <span className="font-normal text-slate-400">(optional)</span>
              <input
                className={fieldClass}
                name="company"
                defaultValue={value?.company}
                autoComplete="organization"
              />
            </label>
            <label className="col-span-2 max-sm:col-span-1">
              Street address
              <input
                className={fieldClass}
                name="address1"
                defaultValue={formatAddressText(value?.address1)}
                autoComplete="address-line1"
                required
              />
            </label>
            <label className="col-span-2 max-sm:col-span-1">
              Apartment, suite, or unit{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <input
                className={fieldClass}
                name="address2"
                defaultValue={value?.address2}
                autoComplete="address-line2"
              />
            </label>
            <label>
              City
              <input
                className={fieldClass}
                name="city"
                defaultValue={formatAddressText(value?.city)}
                autoComplete="address-level2"
                required
              />
            </label>
            <label>
              State
              <select
                className={fieldClass}
                name="state"
                defaultValue={value?.state}
                autoComplete="address-level1"
                required
              >
                <option value="">Select state</option>
                {US_STATES.map(([code, name]) => (
                  <option value={code} key={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ZIP code
              <input
                className={fieldClass}
                name="postalCode"
                defaultValue={value?.postalCode}
                autoComplete="postal-code"
                pattern="[0-9]{5}(-[0-9]{4})?"
                required
              />
            </label>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5 [&_button]:rounded-lg [&_button]:px-5 [&_button]:py-3 [&_button]:text-sm [&_button]:font-bold">
            <button
              className="border border-slate-300"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              className="bg-[#0a8d99] text-white disabled:cursor-wait disabled:opacity-65"
              type="submit"
              disabled={saving}
            >
              {saving ? <LoadingIndicator label="Saving address…" /> : "Save address"}
            </button>
          </footer>
        </form>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Saved addresses</h2>
        {addresses.length < MAX_SAVED_ADDRESSES && (
          <button
            className="shrink-0 rounded-lg bg-[#0a8d99] px-4 py-2.5 text-sm font-semibold text-white"
            type="button"
            onClick={() => setEditing("new")}
          >
            ＋ Add address
          </button>
        )}
      </div>

      {addresses.length ? (
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {addresses.map((address) => (
            <article className="rounded-xl border border-slate-200 bg-white p-5" key={address.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold">{address.label}</h3>
                {address.isDefault && (
                  <span className="rounded-full bg-[#e5f7f8] px-2.5 py-1 text-xs font-semibold text-[#08788c]">
                    Default
                  </span>
                )}
              </div>
              <address className="mt-3 text-sm not-italic leading-6 text-slate-600">
                {address.firstName} {address.lastName}
                <br />
                {address.company && (
                  <>
                    {address.company}
                    <br />
                  </>
                )}
                {formatAddressText(address.address1)}
                <br />
                {address.address2 && (
                  <>
                    {address.address2}
                    <br />
                  </>
                )}
                {formatAddressText(address.city)}, {address.state} {address.postalCode}
              </address>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm font-semibold text-[#08788c]">
                <button type="button" onClick={() => setEditing(address)}>
                  Edit
                </button>
                {!address.isDefault && (
                  <button type="button" onClick={() => void makeDefault(address.id)}>
                    Make default
                  </button>
                )}
                <button
                  className="text-red-600"
                  type="button"
                  onClick={() => void remove(address.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-semibold">No saved addresses</h3>
          <p className="mt-2 text-sm text-slate-500">
            Add an address here or save one during checkout.
          </p>
        </div>
      )}
    </section>
  );
}
