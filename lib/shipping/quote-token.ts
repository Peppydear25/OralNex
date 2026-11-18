import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { DeliveryAddress, Parcel, ShippingRate } from "./easypost-rates";

const MAX_AGE_MS = 5 * 60 * 1000;

function sign(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function binding(secret: string, address: DeliveryAddress, parcels: Parcel[]) {
  return sign(secret, `shipping-input\0${JSON.stringify({ address, parcels })}`);
}

export function createQuoteToken(
  secret: string,
  address: DeliveryAddress,
  parcels: Parcel[],
  rates: ShippingRate[],
) {
  const data = Buffer.from(
    JSON.stringify({
      expires: Date.now() + MAX_AGE_MS,
      binding: binding(secret, address, parcels),
      rates,
    }),
  ).toString("base64url");
  return `${data}.${sign(secret, `shipping-quote\0${data}`)}`;
}

export function readQuoteToken(
  secret: string,
  token: string,
  address: DeliveryAddress,
  parcels: Parcel[],
): ShippingRate[] | null {
  if (token.length > 24_000) return null;
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra) return null;
  const expected = Buffer.from(sign(secret, `shipping-quote\0${data}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const quote = JSON.parse(Buffer.from(data, "base64url").toString());
    if (
      !Number.isSafeInteger(quote.expires) ||
      quote.expires <= Date.now() ||
      quote.binding !== binding(secret, address, parcels) ||
      !Array.isArray(quote.rates)
    )
      return null;
    return quote.rates as ShippingRate[];
  } catch {
    return null;
  }
}
