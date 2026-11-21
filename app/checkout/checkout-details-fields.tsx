import Link from "next/link";
import type { BuyerAccount, ShippingAddress } from "../data/buyer-account-store";
import { USPhoneInput } from "../components/us-phone-input";
import { US_STATES } from "./us-states";
import { formatAddressText } from "./format-address-text";

const fieldClass =
  "h-14 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-[#0a8d99] focus:ring-3 focus:ring-[#0a8d99]/10";
const labelClass = "grid min-w-0 text-sm text-slate-700";

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
            <h2 className="text-lg font-semibold sm:text-xl">Contact information</h2>
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
          <label className={`${labelClass} self-end`}>
            <span className="sr-only">Email address</span>
            <input
              className={fieldClass}
              type="email"
              name="email"
              placeholder="Email address"
              defaultValue={buyer?.email}
              autoComplete="email"
              required
            />
          </label>
          <label className={labelClass}>
            <span className="sr-only">Mobile phone</span>
            <USPhoneInput
              placeholder="Mobile phone"
              key={buyer?.phone ?? "guest"}
              className={fieldClass}
              defaultValue={buyer?.phone}
            />
          </label>
        </div>
      </section>
      <section className="min-w-0 bg-white pt-7 pb-3 max-sm:pt-6">
        <h2 className="mb-5 text-lg font-semibold sm:text-xl">Delivery</h2>
        <div className="grid grid-cols-2 gap-4 max-sm:gap-3">
          <label className="relative col-span-2 min-w-0">
            <span className="pointer-events-none absolute left-3.5 top-2 text-xs text-slate-500">
              Country/Region
            </span>
            <select
              className={`${fieldClass} appearance-none pb-1 pr-10 pt-5`}
              name="country"
              autoComplete="country"
              defaultValue="US"
            >
              <option value="US">United States</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m6 8 4 4 4-4" />
            </svg>
          </label>
          <label className={labelClass}>
            <span className="sr-only">First name</span>
            <input
              className={fieldClass}
              name="firstName"
              placeholder="First name"
              defaultValue={savedAddress?.firstName ?? buyer?.firstName}
              autoComplete="given-name"
              maxLength={60}
              required
            />
          </label>
          <label className={labelClass}>
            <span className="sr-only">Last name</span>
            <input
              className={fieldClass}
              name="lastName"
              placeholder="Last name"
              defaultValue={savedAddress?.lastName ?? buyer?.lastName}
              autoComplete="family-name"
              maxLength={60}
              required
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            <span className="sr-only">Company (optional)</span>
            <input
              className={fieldClass}
              name="company"
              placeholder="Company (optional)"
              defaultValue={savedAddress?.company}
              autoComplete="organization"
              maxLength={100}
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            <span className="sr-only">Street address</span>
            <input
              className={fieldClass}
              name="address1"
              placeholder="Address"
              defaultValue={formatAddressText(savedAddress?.address1)}
              autoComplete="address-line1"
              maxLength={120}
              required
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            <span className="sr-only">Apartment, suite, etc. (optional)</span>
            <input
              className={fieldClass}
              name="address2"
              placeholder="Apartment, suite, etc. (optional)"
              defaultValue={savedAddress?.address2}
              autoComplete="address-line2"
              maxLength={80}
            />
          </label>
          <div className="col-span-2 grid grid-cols-3 gap-3 max-sm:gap-2">
            <label className={labelClass}>
              <span className="sr-only">City</span>
              <input
                className={`${fieldClass} max-sm:px-2`}
                name="city"
                placeholder="City"
                defaultValue={formatAddressText(savedAddress?.city)}
                autoComplete="address-level2"
                maxLength={80}
                required
              />
            </label>
            <label className={labelClass}>
              <span className="sr-only">State</span>
              <select
                className={`${fieldClass} max-sm:px-2`}
                name="state"
                defaultValue={savedAddress?.state ?? ""}
                autoComplete="address-level1"
                required
              >
                <option value="" disabled>
                  State
                </option>
                {US_STATES.map(([code, name]) => (
                  <option value={code} key={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className="sr-only">ZIP code</span>
              <input
                className={`${fieldClass} max-sm:px-2`}
                name="postalCode"
                defaultValue={savedAddress?.postalCode}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="ZIP code"
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
