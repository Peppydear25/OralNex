import "server-only";

import { postEasyPost } from "./easypost-http";
import { EasyPostUnavailable, type DeliveryAddress } from "./easypost-rates";

type VerifiedAddress = {
  street1?: string;
  street2?: string | null;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  mode?: string;
};

export class AddressVerificationError extends Error {}

export async function verifyDeliveryAddress(address: DeliveryAddress): Promise<DeliveryAddress> {
  const key = process.env.EASYPOST_API_KEY?.trim();
  if (!key) throw new EasyPostUnavailable("EasyPost is not configured.", "SHIPPING_SETUP_ERROR");

  let response: { status: number; data: unknown };
  try {
    response = await postEasyPost(key, "/v2/addresses", {
      address: {
        name: `${address.firstName} ${address.lastName}`,
        company: address.company,
        street1: address.address1,
        street2: address.address2,
        city: address.city,
        state: address.state,
        zip: address.postalCode,
        country: "US",
      },
      verify_strict: true,
    });
  } catch (error) {
    throw new EasyPostUnavailable(
      "Could not reach EasyPost for address verification.",
      "SHIPPING_RATE_UNAVAILABLE",
      error,
    );
  }
  if (response.status === 400 || response.status === 422)
    throw new AddressVerificationError(
      "We could not verify this delivery address. Check the street, city, state, ZIP code, and apartment number.",
    );
  if (response.status < 200 || response.status >= 300)
    throw new EasyPostUnavailable(
      `EasyPost address verification returned HTTP ${response.status}.`,
      response.status === 401 || response.status === 403
        ? "SHIPPING_SETUP_ERROR"
        : "SHIPPING_RATE_UNAVAILABLE",
    );

  const verified = response.data as VerifiedAddress;
  const expectedMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "production"
    : "test";
  if (verified.mode !== expectedMode)
    throw new EasyPostUnavailable(
      "Address verification and payment modes do not match.",
      "SHIPPING_SETUP_ERROR",
    );
  if (
    !verified.street1 ||
    !verified.city ||
    !verified.state ||
    !verified.zip ||
    verified.country !== "US"
  )
    throw new EasyPostUnavailable("EasyPost returned an incomplete verified address.");
  return {
    ...address,
    address1: verified.street1,
    address2: verified.street2 || undefined,
    city: verified.city,
    state: verified.state,
    postalCode: verified.zip,
  };
}

export function addressNeedsConfirmation(input: DeliveryAddress, verified: DeliveryAddress) {
  const normalize = (value: string | undefined) =>
    (value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  return (["address1", "address2", "city", "state", "postalCode"] as const).some(
    (field) => normalize(input[field]) !== normalize(verified[field]),
  );
}
