import { afterEach, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("../lib/shipping/easypost-http", () => ({ postEasyPost: post }));
import {
  AddressVerificationError,
  addressNeedsConfirmation,
  verifyDeliveryAddress,
} from "../lib/shipping/easypost-address";

const address = {
  firstName: "Test",
  lastName: "Buyer",
  address1: "1912 Sherwood Way",
  city: "San Angelo",
  state: "TX",
  postalCode: "76901",
};

afterEach(() => {
  post.mockReset();
  vi.unstubAllEnvs();
});

it("strictly verifies the complete address and returns carrier-standardized fields", async () => {
  vi.stubEnv("EASYPOST_API_KEY", "EZTK_test_key");
  post.mockResolvedValue({
    status: 201,
    data: {
      mode: "test",
      country: "US",
      street1: "1912 SHERWOOD WAY",
      street2: null,
      city: "SAN ANGELO",
      state: "TX",
      zip: "76901-1234",
    },
  });
  const verified = await verifyDeliveryAddress(address);
  expect(post).toHaveBeenCalledWith(
    "EZTK_test_key",
    "/v2/addresses",
    expect.objectContaining({ verify_strict: true }),
  );
  expect(verified.postalCode).toBe("76901-1234");
  expect(addressNeedsConfirmation(address, verified)).toBe(true);
});

it("does not request shipping rates for an undeliverable address", async () => {
  vi.stubEnv("EASYPOST_API_KEY", "EZTK_test_key");
  post.mockResolvedValue({ status: 422, data: { error: { code: "ADDRESS.VERIFY.FAILURE" } } });
  await expect(verifyDeliveryAddress(address)).rejects.toBeInstanceOf(AddressVerificationError);
});
