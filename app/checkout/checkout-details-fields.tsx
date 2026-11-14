import Link from "next/link";
import type { BuyerAccount, ShippingAddress } from "../data/buyer-account-store";
import { USPhoneInput } from "../components/us-phone-input";
import { US_STATES } from "./us-states";
import { formatAddressText } from "./format-address-text";

const fieldClass =
  "h-12 min-w-0 w-full rounded-lg border border-slate-300 bg-[#fafcfc] px-3.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0a8d99] focus:ring-3 focus:ring-[#0a8d99]/10";
const labelClass = "grid min-w-0 gap-1.5 text-[13px] font-medium text-slate-700";

export function CheckoutDetailsFields({
  buyer,
  savedAddress,
  canSaveAddress,
}: {
  buyer: BuyerAccount | null;
  savedAddress?: ShippingAddress;
  canSaveAddress: boolean;
}) {
  return (
    <>
      <section className="min-w-0 bg-white pb-2">
        <div className="mb-6 flex justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold">Contact information</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              For order confirmation and delivery updates.
            </p>
          </div>
          {buyer ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e9f7f8] text-[#08788c]"
              role="status"
              title="Signed in"
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              <span className="sr-only">Signed in</span>
            </span>
          ) : (
            <Link
              className="h-fit text-[13px] font-semibold text-[#08788c]"
              href="/account?returnTo=/checkout"
            >
              Sign in
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label className={labelClass}>
            Email address
            <input
              className={fieldClass}
              type="email"
              name="email"
              defaultValue={buyer?.email}
              autoComplete="email"
              required
            />
          </label>
          <label className={labelClass}>
            Mobile phone
            <USPhoneInput
              key={buyer?.phone ?? "guest"}
              className={fieldClass}
              defaultValue={buyer?.phone}
            />
          </label>
        </div>
      </section>
      <section className="min-w-0 bg-white pt-7 pb-3 max-sm:pt-6">
        <h2 className="text-base font-semibold">Shipping address</h2>
        <p className="mb-5 mt-1 text-[13px] text-slate-500">Where should we deliver your order?</p>
        <div className="grid grid-cols-2 gap-4 max-sm:gap-3">
          <label className={`${labelClass} col-span-2`}>
            Country
            <input
              className={`${fieldClass} bg-slate-50 text-slate-600`}
              value="United States"
              readOnly
              aria-readonly="true"
            />
          </label>
          <label className={labelClass}>
            First name
            <input
              className={fieldClass}
              name="firstName"
              defaultValue={savedAddress?.firstName ?? buyer?.firstName}
              autoComplete="given-name"
              maxLength={60}
              required
            />
          </label>
          <label className={labelClass}>
            Last name
            <input
              className={fieldClass}
              name="lastName"
              defaultValue={savedAddress?.lastName ?? buyer?.lastName}
              autoComplete="family-name"
              maxLength={60}
              required
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            <span>
              Company <span className="text-xs font-normal text-slate-500">(optional)</span>
            </span>
            <input
              className={fieldClass}
              name="company"
              defaultValue={savedAddress?.company}
              autoComplete="organization"
              maxLength={100}
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Street address
            <input
              className={fieldClass}
              name="address1"
              defaultValue={formatAddressText(savedAddress?.address1)}
              autoComplete="address-line1"
              maxLength={120}
              required
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Apartment, suite, or unit <span className="font-normal text-slate-400">(optional)</span>
            <input
              className={fieldClass}
              name="address2"
              defaultValue={savedAddress?.address2}
              autoComplete="address-line2"
              maxLength={80}
            />
          </label>
          <div className="col-span-2 grid grid-cols-3 gap-3 max-sm:gap-2">
            <label className={labelClass}>
              City
              <input
                className={`${fieldClass} max-sm:px-2`}
                name="city"
                defaultValue={formatAddressText(savedAddress?.city)}
                autoComplete="address-level2"
                maxLength={80}
                required
              />
            </label>
            <label className={labelClass}>
              State
              <select
                className={`${fieldClass} max-sm:px-2`}
                name="state"
                defaultValue={savedAddress?.state ?? ""}
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
            <label className={labelClass}>
              ZIP code
              <input
                className={`${fieldClass} max-sm:px-2`}
                name="postalCode"
                defaultValue={savedAddress?.postalCode}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="12345"
                pattern="[0-9]{5}(-[0-9]{4})?"
                title="Enter a 5-digit ZIP code or ZIP+4"
                required
              />
            </label>
          </div>
        </div>
        {canSaveAddress && (
          <label className="mt-3 flex min-h-11 items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            <input
              className="size-4 shrink-0 accent-[#0a8d99]"
              type="checkbox"
              name="saveAddress"
              defaultChecked={!savedAddress}
            />
            <span>
              {savedAddress
                ? "Update my default saved address with these details."
                : "Save this address to my account for faster checkout next time."}
            </span>
          </label>
        )}
      </section>
    </>
  );
}
