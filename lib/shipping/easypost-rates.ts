import "server-only";

import { postEasyPostShipment } from "./easypost-http";

export type Parcel = {
  weightOunces: number;
  lengthInches: number;
  widthInches: number;
  heightInches: number;
};
export type DeliveryAddress = {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
};
export type ShippingRate = {
  key: string;
  carrier: string;
  service: string;
  serviceName: string;
  amountCents: number;
  minimumBusinessDays: number;
  maximumBusinessDays: number;
};

type ApiRate = {
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days?: number | null;
};
type ApiShipment = { mode?: "test" | "production"; rates?: ApiRate[] };

export class EasyPostUnavailable extends Error {
  constructor(
    message: string,
    readonly code:
      | "SHIPPING_RATE_UNAVAILABLE"
      | "SHIPPING_SETUP_ERROR"
      | "SHIPPING_DETAILS_INVALID" = "SHIPPING_RATE_UNAVAILABLE",
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export function easypostReady() {
  return Boolean(
    process.env.EASYPOST_API_KEY?.trim() &&
    process.env.EASYPOST_ORIGIN_NAME?.trim() &&
    process.env.EASYPOST_ORIGIN_STREET?.trim() &&
    process.env.EASYPOST_ORIGIN_CITY?.trim() &&
    /^[A-Z]{2}$/.test(process.env.EASYPOST_ORIGIN_STATE?.trim() ?? "") &&
    /^\d{5}(?:-\d{4})?$/.test(process.env.EASYPOST_ORIGIN_ZIP?.trim() ?? ""),
  );
}

function cents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Math.round(Number(value) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

/** Create one EasyPost Shipment per physical parcel. USPS is not supported by EasyPost Orders. */
export async function quoteEasyPost(
  parcels: Parcel[],
  to: DeliveryAddress,
): Promise<ShippingRate[]> {
  if (!easypostReady() || !parcels.length || parcels.length > 20)
    throw new EasyPostUnavailable(
      "Shipping is not configured for this order.",
      "SHIPPING_SETUP_ERROR",
    );
  const key = process.env.EASYPOST_API_KEY!.trim();
  const from = {
    name: process.env.EASYPOST_ORIGIN_NAME!.trim(),
    street1: process.env.EASYPOST_ORIGIN_STREET!.trim(),
    street2: process.env.EASYPOST_ORIGIN_STREET2?.trim() || undefined,
    city: process.env.EASYPOST_ORIGIN_CITY!.trim(),
    state: process.env.EASYPOST_ORIGIN_STATE!.trim(),
    zip: process.env.EASYPOST_ORIGIN_ZIP!.trim(),
    country: "US",
  };
  const destination = {
    name: `${to.firstName} ${to.lastName}`,
    company: to.company || undefined,
    street1: to.address1,
    street2: to.address2 || undefined,
    city: to.city,
    state: to.state,
    zip: to.postalCode,
    country: "US",
  };
  // Bound concurrent external calls; no rate is invented if one parcel fails.
  const shipmentRates: ApiRate[][] = [];
  for (let offset = 0; offset < parcels.length; offset += 4) {
    const batch = await Promise.all(
      parcels.slice(offset, offset + 4).map(async (parcel) => {
        if (
          !Number.isFinite(parcel.weightOunces) ||
          parcel.weightOunces <= 0 ||
          parcel.weightOunces > 2400 ||
          ![parcel.lengthInches, parcel.widthInches, parcel.heightInches].every(
            (n) => Number.isFinite(n) && n > 0 && n <= 108,
          )
        )
          throw new EasyPostUnavailable("Shipping package measurements are unavailable.");
        let response: { status: number; data: unknown };
        try {
          response = await postEasyPostShipment(key, {
            to_address: destination,
            from_address: from,
            parcel: {
              weight: Math.ceil(parcel.weightOunces * 100) / 100,
              length: Math.ceil(parcel.lengthInches),
              width: Math.ceil(parcel.widthInches),
              height: Math.ceil(parcel.heightInches),
            },
          });
        } catch (error) {
          throw new EasyPostUnavailable(
            error instanceof Error && error.name === "TimeoutError"
              ? "EasyPost rating request timed out."
              : "Could not connect to EasyPost for rates.",
            "SHIPPING_RATE_UNAVAILABLE",
            error,
          );
        }
        if (response.status < 200 || response.status >= 300) {
          const code = [400, 422].includes(response.status)
            ? "SHIPPING_DETAILS_INVALID"
            : [401, 402, 403].includes(response.status)
              ? "SHIPPING_SETUP_ERROR"
              : "SHIPPING_RATE_UNAVAILABLE";
          throw new EasyPostUnavailable(`EasyPost rating returned HTTP ${response.status}.`, code);
        }
        const shipment = response.data as ApiShipment;
        const expectedMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
          ? "production"
          : "test";
        if (shipment.mode !== expectedMode)
          throw new EasyPostUnavailable(
            "Shipping and payment modes do not match.",
            "SHIPPING_SETUP_ERROR",
          );
        if (!Array.isArray(shipment.rates))
          throw new EasyPostUnavailable("The carrier returned no rates.");
        return shipment.rates;
      }),
    );
    shipmentRates.push(...batch);
  }

  const candidates = new Map<string, ShippingRate>();
  shipmentRates.forEach((rates, index) => {
    const cheapest = new Map<string, { rate: ApiRate; amountCents: number }>();
    for (const rate of rates) {
      const amount = rate.currency === "USD" ? cents(rate.rate) : null;
      if (amount === null || !/^(USPS|UPS|FedEx)$/.test(rate.carrier)) continue;
      const key = `${rate.carrier}:${rate.service}`;
      if (!/^[A-Za-z0-9:_ -]{1,100}$/.test(key)) continue;
      if (!cheapest.has(key) || cheapest.get(key)!.amountCents > amount)
        cheapest.set(key, { rate, amountCents: amount });
    }
    if (index === 0) {
      for (const [key, { rate, amountCents }] of cheapest)
        candidates.set(key, {
          key,
          carrier: rate.carrier,
          service: rate.service,
          serviceName: `${rate.carrier} ${rate.service.replace(/([a-z])([A-Z])/g, "$1 $2")}`,
          amountCents,
          minimumBusinessDays: rate.delivery_days ?? 0,
          maximumBusinessDays: rate.delivery_days ?? 0,
        });
    } else {
      for (const [key, combined] of candidates) {
        const match = cheapest.get(key);
        if (!match) {
          candidates.delete(key);
          continue;
        }
        combined.amountCents += match.amountCents;
        combined.minimumBusinessDays = Math.max(
          combined.minimumBusinessDays,
          match.rate.delivery_days ?? 0,
        );
        combined.maximumBusinessDays = Math.max(
          combined.maximumBusinessDays,
          match.rate.delivery_days ?? 0,
        );
      }
    }
  });
  return [...candidates.values()].sort((a, b) => a.amountCents - b.amountCents);
}
