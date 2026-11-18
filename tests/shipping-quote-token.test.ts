import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createQuoteToken, readQuoteToken } from "../lib/shipping/quote-token";

const address = {
  firstName: "Test",
  lastName: "Buyer",
  address1: "1 Main St",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
};
const parcels = [{ weightOunces: 16, lengthInches: 8, widthInches: 6, heightInches: 4 }];
const rates = [
  {
    key: "USPS:Ground",
    carrier: "USPS",
    service: "Ground",
    serviceName: "USPS Ground",
    amountCents: 500,
    minimumBusinessDays: 0,
    maximumBusinessDays: 0,
  },
];

afterEach(() => vi.useRealTimers());

it("binds a rate to the verified address and parcels and expires it", () => {
  vi.useFakeTimers();
  const token = createQuoteToken("secret", address, parcels, rates);
  expect(readQuoteToken("secret", token, address, parcels)).toEqual(rates);
  expect(readQuoteToken("secret", token, { ...address, postalCode: "78702" }, parcels)).toBeNull();
  expect(
    readQuoteToken("secret", token, address, [{ ...parcels[0], weightOunces: 17 }]),
  ).toBeNull();
  vi.advanceTimersByTime(5 * 60 * 1000);
  expect(readQuoteToken("secret", token, address, parcels)).toBeNull();
});
