import { describe, expect, it } from "vitest";
import { MAX_SAVED_ADDRESSES, isAddressLimitError } from "./address-limit";

describe("saved shipping address limit", () => {
  it("allows only two saved addresses per account", () => {
    expect(MAX_SAVED_ADDRESSES).toBe(2);
  });

  it("recognizes the database limit violation", () => {
    expect(isAddressLimitError({ code: "23514" })).toBe(true);
    expect(isAddressLimitError({ code: "23505" })).toBe(false);
    expect(isAddressLimitError(null)).toBe(false);
  });
});
