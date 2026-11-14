import { describe, expect, it } from "vitest";
import { subtractPurchasedItems, type CartItem } from "./cart-store";

describe("paid checkout cart reconciliation", () => {
  const purchased: CartItem[] = [{ productId: 3, quantity: 2, size: "Small", color: "Blue" }];

  it("clears purchased items from an unchanged cart", () => {
    expect(subtractPurchasedItems(purchased, purchased)).toEqual([]);
  });

  it("preserves items added after checkout started", () => {
    expect(
      subtractPurchasedItems(
        [
          { productId: 3, quantity: 3, size: "Small", color: "Blue" },
          { productId: 9, quantity: 1 },
        ],
        purchased,
      ),
    ).toEqual([
      { productId: 3, quantity: 1, size: "Small", color: "Blue" },
      { productId: 9, quantity: 1 },
    ]);
  });

  it("does not remove a different product option", () => {
    const different = [{ productId: 3, quantity: 1, size: "Large", color: "Black" }];
    expect(subtractPurchasedItems(different, purchased)).toEqual(different);
  });
});
