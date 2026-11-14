import type { RefObject } from "react";
import type { ShippingAddress } from "../data/buyer-account-store";
import { formatAddressText } from "./format-address-text";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  address: ShippingAddress | null;
  onUseAddress: (address: ShippingAddress) => void;
  onClose: () => void;
};

export function AddressConfirmationDialog({ dialogRef, address, onUseAddress, onClose }: Props) {
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="address-confirmation-title"
      aria-describedby="address-confirmation-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-[#071e24]/60 backdrop:backdrop-blur-sm"
    >
      {address && (
        <div className="p-6 sm:p-7">
          <span
            className="mb-4 grid size-10 place-items-center rounded-full bg-[#e8f6f7] text-[#08788c]"
            aria-hidden="true"
          >
            ✓
          </span>
          <h2 id="address-confirmation-title" className="text-xl font-semibold">
            Confirm delivery address
          </h2>
          <p
            id="address-confirmation-description"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            We found a verified version of your address. Is this where you want your order
            delivered?
          </p>
          <address className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium not-italic leading-6">
            {formatAddressText(address.address1)}
            {address.address2 ? (
              <>
                <br />
                {address.address2}
              </>
            ) : null}
            <br />
            {formatAddressText(address.city)}, {address.state} {address.postalCode}
          </address>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-[#0a8d99] px-4 text-sm font-semibold text-white hover:bg-[#087b86]"
              onClick={() => onUseAddress(address)}
            >
              Yes, use this address
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Edit address
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
