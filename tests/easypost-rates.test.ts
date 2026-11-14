import { afterEach, expect, it, vi } from "vitest";

const postShipment = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("../lib/shipping/easypost-http", () => ({ postEasyPostShipment: postShipment }));
import { quoteEasyPost, type DeliveryAddress } from "../lib/shipping/easypost-rates";

const address: DeliveryAddress = {
  firstName: "Test",
  lastName: "Buyer",
  address1: "123 Main St",
  city: "Christoval",
  state: "TX",
  postalCode: "76935",
};
const parcel = { weightOunces: 8, lengthInches: 8, widthInches: 5, heightInches: 4 };

afterEach(() => {
  vi.unstubAllEnvs();
  postShipment.mockReset();
});

function configure() {
  vi.stubEnv("EASYPOST_API_KEY", "EZTK_test_key");
  vi.stubEnv("EASYPOST_ORIGIN_NAME", "OralNex");
  vi.stubEnv("EASYPOST_ORIGIN_STREET", "1912 Sherwood Way");
  vi.stubEnv("EASYPOST_ORIGIN_CITY", "San Angelo");
  vi.stubEnv("EASYPOST_ORIGIN_STATE", "TX");
  vi.stubEnv("EASYPOST_ORIGIN_ZIP", "76901");
}

it("sends one shipment per actual parcel and adds only rates returned by EasyPost", async () => {
  configure();
  postShipment
    .mockResolvedValueOnce({
      status: 201,
      data: {
        mode: "test",
        rates: [
          { carrier: "USPS", service: "GroundAdvantage", rate: "4.27", currency: "USD" },
          { carrier: "UPS", service: "Ground", rate: "6.00", currency: "USD" },
        ],
      },
    })
    .mockResolvedValueOnce({
      status: 201,
      data: {
        mode: "test",
        rates: [{ carrier: "USPS", service: "GroundAdvantage", rate: "5.13", currency: "USD" }],
      },
    });
  const rates = await quoteEasyPost([parcel, { ...parcel, weightOunces: 16 }], address);
  expect(postShipment).toHaveBeenCalledTimes(2);
  expect(postShipment.mock.calls[0][1].parcel.weight).toBe(8);
  expect(postShipment.mock.calls[1][1].parcel.weight).toBe(16);
  expect(postShipment.mock.calls[0][1].to_address.zip).toBe("76935");
  expect(rates).toEqual([expect.objectContaining({ carrier: "USPS", amountCents: 940 })]);
});

it("fails closed if any parcel cannot be rated", async () => {
  configure();
  postShipment.mockResolvedValue({ status: 503, data: {} });
  await expect(quoteEasyPost([parcel], address)).rejects.toMatchObject({
    code: "SHIPPING_RATE_UNAVAILABLE",
    message: "EasyPost rating returned HTTP 503.",
  });
});

it("identifies address or package rejection without exposing provider details", async () => {
  configure();
  postShipment.mockResolvedValue({ status: 422, data: {} });
  await expect(quoteEasyPost([parcel], address)).rejects.toMatchObject({
    code: "SHIPPING_DETAILS_INVALID",
  });
});

it("identifies a carrier connection timeout", async () => {
  configure();
  postShipment.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
  await expect(quoteEasyPost([parcel], address)).rejects.toMatchObject({
    code: "SHIPPING_RATE_UNAVAILABLE",
    message: "EasyPost rating request timed out.",
  });
});

it("never charges a live Stripe payment using test-mode carrier rates", async () => {
  configure();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_placeholder");
  postShipment.mockResolvedValue({
    status: 201,
    data: {
      mode: "test",
      rates: [{ carrier: "USPS", service: "GroundAdvantage", rate: "4.27", currency: "USD" }],
    },
  });
  await expect(quoteEasyPost([parcel], address)).rejects.toThrow("modes do not match");
});
