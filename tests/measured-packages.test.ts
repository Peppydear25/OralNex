import { expect, it } from "vitest";
import { sameAutomaticPacking } from "../app/data/supabase-admin-catalog";
import {
  emptyAutomaticPacking,
  validAutomaticPacking,
  packAutomatically,
  coversAllBoxQuantities,
  type AutomaticPacking,
} from "../lib/shipping/automatic-packing";
import {
  measuredPackagesDraft,
  cartonsAndSinglesDraft,
  newMeasuredPackage,
  parsePackageSize,
  packageSize,
  poundsToKg,
  kgToPounds,
} from "../lib/shipping/measured-packages";

const preset = (boxes: number, pounds: number, size = "13 x 8 x 4", sku = "") => ({
  ...newMeasuredPackage(sku, boxes),
  ...parsePackageSize(size)!,
  grossWeightBySku: { [sku]: poundsToKg(pounds) },
});
const packing: AutomaticPacking = {
  ...measuredPackagesDraft(emptyAutomaticPacking),
  verified: true,
  units: [{ variantSku: "", weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 }],
  cartons: [preset(1, 1), preset(5, 4), preset(40, 22, "21 x 16 x 14")],
};

it("uses exact presets for full cartons and remainders without estimating weights", () => {
  expect(validAutomaticPacking(packing)).toBe(true);
  expect(coversAllBoxQuantities(packing, 40)).toBe(true);
  const parcels = packAutomatically(packing, 86, "");
  expect(parcels.map((p) => p.boxes).sort((a, b) => a - b)).toEqual([1, 5, 40, 40]);
  expect(parcels.reduce((sum, p) => sum + p.weightPounds, 0)).toBe(49);
  for (const parcel of parcels)
    expect(parcel.weightPounds).toBe({ 1: 1, 5: 4, 40: 22 }[parcel.boxes as 1 | 5 | 40]);
});

it("preserves every box in quantities from one through 999", () => {
  for (let quantity = 1; quantity <= 999; quantity++) {
    const parcels = packAutomatically(packing, quantity, "");
    expect(parcels.reduce((total, p) => total + p.boxes, 0)).toBe(quantity);
    expect(parcels.length).toBeLessThanOrEqual(100);
    expect(parcels.every((p) => [1, 5, 40].includes(p.boxes))).toBe(true);
  }
});

it("finds a better combination than greedily choosing the largest package", () => {
  const custom = { ...packing, cartons: [preset(1, 1), preset(3, 3), preset(4, 4)] };
  expect(packAutomatically(custom, 6, "").map((p) => p.boxes)).toEqual([3, 3]);
});

it("chooses less shipping volume when parcel counts match", () => {
  const custom = { ...packing, cartons: [preset(1, 1, "20 x 20 x 20"), preset(1, 1, "8 x 6 x 4")] };
  expect(packAutomatically(custom, 1, "")[0].lengthInches).toBe(8);
});

it("does not estimate missing packages, mix SKUs, or exceed parcel limits", () => {
  expect(() => packAutomatically({ ...packing, cartons: [preset(40, 22)] }, 6, "")).toThrow();
  expect(() => packAutomatically(packing, 6, "OTHER")).toThrow();
  expect(() => packAutomatically({ ...packing, cartons: [preset(1, 1)] }, 101, "")).toThrow();
  expect(() => packAutomatically({ ...packing, verified: false }, 1, "")).toThrow();
});

it("converts inches and pounds without changing entered measurements", () => {
  expect(packageSize(preset(1, 2))).toBe("13 × 8 × 4");
  expect(kgToPounds(poundsToKg(2.51))).toBe(2.51);
  expect(packAutomatically({ ...packing, cartons: [preset(1, 2.51)] }, 1, "")[0].weightPounds).toBe(
    2.51,
  );
  for (const input of [
    "",
    "13 x 8",
    "0 x 8 x 4",
    "Infinity x 8 x 4",
    "109 x 8 x 4",
    "13foo x 8 x 4",
  ])
    expect(parsePackageSize(input)).toBeNull();
  expect(validAutomaticPacking({ ...packing, cartons: [preset(1, 2, "100 x 50 x 50")] })).toBe(
    false,
  );
});

it("clears old partial estimates and requires reconfirmation without changing saved data", () => {
  const legacy = {
    ...packing,
    strategy: undefined,
    cartons: [
      {
        ...packing.cartons[0],
        tareKg: 0.2,
        partialMaxBoxes: 2,
        partialDimensionsCm: { lengthCm: 20, widthCm: 10, heightCm: 10 },
      },
    ],
  };
  const draft = measuredPackagesDraft(legacy);
  expect(draft.verified).toBe(false);
  expect(draft.cartons[0].partialDimensionsCm).toBeUndefined();
  expect(draft.cartons[0].partialMaxBoxes).toBeUndefined();
  expect(draft.cartons[0].tareKg).toBe(0);
  expect(draft.cartons[0].grossWeightBySku).toEqual(legacy.cartons[0].grossWeightBySku);
  expect(legacy.cartons[0].tareKg).toBe(0.2);
  expect(sameAutomaticPacking(packing, { ...packing, strategy: undefined })).toBe(false);
});

it("rejects mixed strategies and malformed data", () => {
  expect(validAutomaticPacking({ ...packing, cartons: {} })).toBe(false);
  expect(
    validAutomaticPacking({ ...packing, cartons: [{ ...packing.cartons[0], partialMaxBoxes: 1 }] }),
  ).toBe(false);
  expect(validAutomaticPacking({ ...packing, strategy: "unknown" })).toBe(false);
});

it("drops geometric-only cartons that cannot be edited as exact packed presets", () => {
  const geometric = {
    ...packing,
    mode: undefined,
    strategy: undefined,
    cartons: [{ ...packing.cartons[0], capacityBySku: undefined, grossWeightBySku: undefined }],
  };
  const draft = measuredPackagesDraft(geometric);
  expect(draft.cartons).toEqual([]);
  expect(draft.units).toHaveLength(1);
  expect(draft.verified).toBe(false);
});

it.each([1, 3, 17, 40, 41, 43, 85, 86, 999])(
  "combines %i boxes into full cartons and measured smaller parcels",
  (quantity) => {
    const draft = cartonsAndSinglesDraft(packing, 40);
    const config = {
      ...draft,
      verified: true,
      units: [{ ...draft.units[0], weightKg: poundsToKg(0.5) }],
      cartons: draft.cartons.map((carton) =>
        carton.capacityBySku?.[""] === 40
          ? {
              ...carton,
              partialMaxBoxes: 20,
              partialDimensionsCm: parsePackageSize("18 x 12 x 10")!,
              tareKg: poundsToKg(1),
            }
          : carton,
      ),
    };
    expect(coversAllBoxQuantities(config, 40)).toBe(true);
    const plan = packAutomatically(config, quantity, "");
    const cartons = Math.floor(quantity / 40);
    const remainder = quantity % 40;
    expect(plan.filter((p) => p.boxes === 40)).toHaveLength(cartons);
    expect(plan).toHaveLength(cartons + Math.ceil(remainder / 20));
    expect(plan.reduce((total, p) => total + p.boxes, 0)).toBe(quantity);
    expect(plan.filter((p) => p.boxes === 40).every((p) => p.lengthInches === 21)).toBe(true);
    for (const parcel of plan.filter((p) => p.boxes === 1))
      expect(parcel.lengthInches).toBeCloseTo(13);
    for (const parcel of plan.filter((p) => p.boxes > 1 && p.boxes < 40)) {
      expect(parcel.lengthInches).toBeCloseTo(18);
      expect(parcel.weightPounds).toBeCloseTo(parcel.boxes * 0.5 + 1, 1);
    }
  },
);

it("refuses an oversized full-carton quote for an unmeasured two-box order", () => {
  const config = { ...cartonsAndSinglesDraft(packing, 40), verified: true };
  expect(coversAllBoxQuantities(config, 40)).toBe(false);
  expect(() => packAutomatically(config, 2, "")).toThrow();
  expect(packAutomatically(config, 1, "")).toHaveLength(1);
  expect(packAutomatically(config, 40, "")).toHaveLength(1);
});

it("drops multipacks, preserves measured single/carton weights, and requires reconfirmation", () => {
  const draft = cartonsAndSinglesDraft(packing, 40);
  expect(draft.strategy).toBe("cartons_and_singles");
  expect(draft.verified).toBe(false);
  expect(draft.cartons.map((p) => p.capacityBySku?.[""])).toEqual([1, 40]);
  expect(draft.cartons.map((p) => kgToPounds(p.grossWeightBySku![""]))).toEqual([1, 22]);
  expect(cartonsAndSinglesDraft({ ...draft, verified: true }, 40).verified).toBe(true);
  const changed = cartonsAndSinglesDraft({ ...draft, verified: true }, 50);
  expect(changed.verified).toBe(false);
  expect(changed.cartons[1].grossWeightBySku).toEqual({});
  expect(packing.cartons).toHaveLength(3);
});

it("handles single-box cartons and refuses missing or excessive parcel plans", () => {
  const single = { ...cartonsAndSinglesDraft(packing, 1), verified: true };
  expect(single.cartons).toHaveLength(1);
  expect(packAutomatically(single, 3, "")).toHaveLength(3);
  expect(() => packAutomatically(single, 101, "")).toThrow();
  const fullOnly = {
    ...cartonsAndSinglesDraft(packing, 40),
    verified: true,
    cartons: [preset(40, 22)],
  };
  expect(coversAllBoxQuantities(fullOnly, 40)).toBe(false);
  expect(() => packAutomatically(fullOnly, 43, "")).toThrow();
});
