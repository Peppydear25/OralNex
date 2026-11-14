import { expect, it } from "vitest";
import {
  planPackages,
  validPackageProfiles,
  ShippingQuoteRequired,
  type PackageProfile,
} from "../lib/shipping/package-profiles";

const carton: PackageProfile = {
  name: "Mask carton",
  variantSku: "",
  boxes: 40,
  weightKg: 9.4,
  lengthCm: 52,
  widthCm: 39,
  heightCm: 34,
  verified: true,
};
const single: PackageProfile = {
  ...carton,
  name: "Test single",
  boxes: 1,
  weightKg: 0.3,
  lengthCm: 20,
  widthCm: 15,
  heightCm: 10,
};

it.each([1, 5, 39, 41])("does not invent a partial carton for %i boxes", (quantity) => {
  expect(() => planPackages([carton], quantity, "")).toThrow(ShippingQuoteRequired);
});
it.each([40, 80])("uses measured gross carton weight for %i boxes", (quantity) => {
  expect(planPackages([carton], quantity, "")).toEqual([
    {
      weightPounds: 20.73,
      lengthInches: 52 / 2.54,
      widthInches: 39 / 2.54,
      heightInches: 34 / 2.54,
      groupPackageCount: quantity / 40,
    },
  ]);
});
it("combines a carton and single without prorating weight", () => {
  const parcels = planPackages([single, carton], 41, "");
  expect(parcels.reduce((n, p) => n + p.groupPackageCount, 0)).toBe(2);
  expect(parcels.map((p) => p.weightPounds).sort((a, b) => a - b)).toEqual([0.67, 20.73]);
});
it("finds exact combinations instead of greedy remainder failures", () => {
  const parcels = planPackages(
    [
      { ...single, boxes: 4 },
      { ...single, boxes: 3 },
    ],
    6,
    "",
  );
  expect(parcels[0].groupPackageCount).toBe(2);
});
it("does not borrow a different variant's profile", () => {
  expect(() => planPackages([{ ...single, variantSku: "BLACK" }], 1, "BLUE")).toThrow(
    ShippingQuoteRequired,
  );
});
it("ignores unverified profiles", () => {
  expect(() => planPackages([{ ...single, verified: false }], 1, "")).toThrow(
    ShippingQuoteRequired,
  );
});
it.each([
  null,
  {},
  [{ ...single, weightKg: 0 }],
  [{ ...single, boxes: 1.5 }],
  [{ ...single, weightKg: Infinity }],
  [{ ...single, lengthCm: 274, widthCm: 274 }],
])("rejects malformed or oversized profiles", (value) => {
  expect(validPackageProfiles(value)).toBe(false);
});
it("bounds quote workload", () => {
  expect(() => planPackages([single], 101, "")).toThrow(ShippingQuoteRequired);
  expect(() => planPackages([single], 100000, "")).toThrow(ShippingQuoteRequired);
});
