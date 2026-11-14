import { describe, expect, it } from "vitest";
import type { Product } from "../data/catalog";
import { piecesPerCarton, productUnits } from "./packaging";

const product = {
  packaging: { piecesPerBox: 200, boxesPerCarton: 10 },
} as Product;

describe("product packaging", () => {
  it("calculates the number of pieces in a carton", () => {
    expect(piecesPerCarton(product)).toBe(2000);
  });

  it("labels purchase quantities as boxes", () => {
    expect(productUnits(product, 1)).toBe("box");
    expect(productUnits(product, 10)).toBe("boxes");
  });
});
