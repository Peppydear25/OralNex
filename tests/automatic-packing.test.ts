import { expect, it } from "vitest";
import { sameAutomaticPacking } from "../app/data/supabase-admin-catalog";
import {
  cartonGrossDraft,
  cartonCountMatchesPacking,
  packAutomatically,
  coversAllBoxQuantities,
  cartonFit,
  validAutomaticPacking,
  type AutomaticPacking,
} from "../lib/shipping/automatic-packing";

// Synthetic test measurements, not recommended production mask dimensions.
const config: AutomaticPacking = {
  verified: true,
  units: [{ variantSku: "BLUE", weightKg: 0.2, lengthCm: 10, widthCm: 5, heightCm: 2 }],
  cartons: [
    {
      name: "Small",
      innerLengthCm: 10,
      innerWidthCm: 5,
      innerHeightCm: 2,
      lengthCm: 12,
      widthCm: 7,
      heightCm: 4,
      tareKg: 0.1,
      maxWeightKg: 10,
    },
    {
      name: "Large",
      innerLengthCm: 20,
      innerWidthCm: 10,
      innerHeightCm: 20,
      lengthCm: 22,
      widthCm: 12,
      heightCm: 22,
      tareKg: 0.5,
      maxWeightKg: 15,
    },
  ],
};

const simple: AutomaticPacking = {
  ...config,
  units: [{ ...config.units[0], lengthCm: 0, widthCm: 0, heightCm: 0 }],
  cartons: config.cartons.map((c, i) => ({
    ...c,
    capacityBySku: { BLUE: i === 0 ? 1 : 40 },
    innerLengthCm: 0,
    innerWidthCm: 0,
    innerHeightCm: 0,
    maxWeightKg: 68,
  })),
};
it("requires the largest shipping profile to match the retail boxes per carton", () => {
  const gross = {
    ...simple,
    mode: "carton_gross" as const,
    cartons: simple.cartons.map((carton, index) => ({
      ...carton,
      grossWeightBySku: { BLUE: index === 0 ? 0.3 : 9.4 },
    })),
  };
  expect(cartonCountMatchesPacking(gross, 40)).toBe(true);
  expect(cartonCountMatchesPacking(gross, 50)).toBe(false);
  expect(cartonCountMatchesPacking(gross, 0)).toBe(false);
});
it("opens old settings as an unverified carton draft without reusing guessed weights", () => {
  const draft = cartonGrossDraft(simple);
  expect(draft.mode).toBe("carton_gross");
  expect(draft.verified).toBe(false);
  expect(draft.units[0].weightKg).toBe(0);
  expect(draft.cartons[0].capacityBySku).toEqual({ BLUE: 1 });
  expect(draft.cartons[0].grossWeightBySku).toEqual({});
  expect(simple.verified).toBe(true);
  expect(simple.cartons[0].grossWeightBySku).toBeUndefined();
});
const grossCarton: AutomaticPacking = {
  mode: "carton_gross",
  verified: true,
  units: [{ variantSku: "MASK", weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 }],
  cartons: [
    {
      name: "Mask master carton",
      lengthCm: 52,
      widthCm: 39,
      heightCm: 34,
      innerLengthCm: 0,
      innerWidthCm: 0,
      innerHeightCm: 0,
      tareKg: 0,
      maxWeightKg: 68,
      capacityBySku: { MASK: 40 },
      grossWeightBySku: { MASK: 9.4 },
    },
  ],
};
it("never quotes a partial order using a full-carton-only profile", () => {
  expect(coversAllBoxQuantities(grossCarton, 40)).toBe(false);
  expect(validAutomaticPacking(grossCarton)).toBe(true);
  for (const quantity of [1, 5, 39, 41]) {
    expect(() => packAutomatically(grossCarton, quantity, "MASK")).toThrow();
  }
  expect(packAutomatically(grossCarton, 40, "MASK")[0].weightKg).toBe(9.4);
  expect(packAutomatically(grossCarton, 80, "MASK")).toHaveLength(2);
});
// Synthetic one-box parcel dimensions/weight: tests only, not production measurements.
const withSingleParcel: AutomaticPacking = {
  ...grossCarton,
  units: [{ ...grossCarton.units[0], weightKg: 0.235 }],
  cartons: [
    {
      ...grossCarton.cartons[0],
      name: "One-box parcel",
      lengthCm: 25,
      widthCm: 15,
      heightCm: 10,
      capacityBySku: { MASK: 1 },
      grossWeightBySku: { MASK: 0.5 },
    },
    {
      ...grossCarton.cartons[0],
      tareKg: 0.5,
      partialDimensionsCm: { lengthCm: 30, widthCm: 20, heightCm: 15 },
      partialMaxBoxes: 39,
    },
  ],
};
it("confirms a setup only when every box quantity has a measured packing rule", () => {
  expect(coversAllBoxQuantities(withSingleParcel, 40)).toBe(true);
  const withoutPartial = {
    ...withSingleParcel,
    cartons: withSingleParcel.cartons.map((carton) => ({
      ...carton,
      partialDimensionsCm: undefined,
      partialMaxBoxes: undefined,
    })),
  };
  expect(coversAllBoxQuantities(withoutPartial, 40)).toBe(false);
  expect(coversAllBoxQuantities(withoutPartial, 1)).toBe(true);
});
it("never puts more boxes in a partial parcel than its confirmed capacity", () => {
  const fiveBoxPartial: AutomaticPacking = {
    ...withSingleParcel,
    cartons: withSingleParcel.cartons.map((carton, index) =>
      index === 1 ? { ...carton, partialMaxBoxes: 5 } : carton,
    ),
  };
  expect(validAutomaticPacking(fiveBoxPartial)).toBe(true);
  expect(packAutomatically(fiveBoxPartial, 6, "MASK").map((parcel) => parcel.boxes)).toEqual([
    5, 1,
  ]);
  expect(packAutomatically(fiveBoxPartial, 39, "MASK").map((parcel) => parcel.boxes)).toEqual([
    5, 5, 5, 5, 5, 5, 5, 4,
  ]);
  expect(packAutomatically(fiveBoxPartial, 85, "MASK").map((parcel) => parcel.boxes)).toEqual([
    40, 40, 5,
  ]);
  expect(
    validAutomaticPacking({
      ...withSingleParcel,
      cartons: withSingleParcel.cartons.map((carton, index) =>
        index === 1 ? { ...carton, partialMaxBoxes: undefined } : carton,
      ),
    }),
  ).toBe(false);
});
it("uses the standard parcel for one box without requiring a separate one-box profile", () => {
  const standardParcel: AutomaticPacking = {
    ...withSingleParcel,
    cartons: [{ ...withSingleParcel.cartons[1], partialMaxBoxes: 5 }],
  };
  expect(validAutomaticPacking(standardParcel)).toBe(true);
  expect(coversAllBoxQuantities(standardParcel, 40)).toBe(true);
  const one = packAutomatically(standardParcel, 1, "MASK");
  expect(one).toHaveLength(1);
  expect(one[0].boxes).toBe(1);
  expect(one[0].weightKg).toBeCloseTo(0.235 + 0.5);
  expect(one[0].lengthInches).toBeCloseTo(30 / 2.54);
  expect(packAutomatically(standardParcel, 6, "MASK").map((parcel) => parcel.boxes)).toEqual([
    5, 1,
  ]);
  expect(packAutomatically(standardParcel, 41, "MASK").map((parcel) => parcel.boxes)).toEqual([
    40, 1,
  ]);
});
it("checks saved parcel mode and weights, not just box counts", () => {
  expect(sameAutomaticPacking(withSingleParcel, structuredClone(withSingleParcel))).toBe(true);
  expect(
    sameAutomaticPacking(withSingleParcel, {
      ...withSingleParcel,
      cartons: withSingleParcel.cartons.map((carton, index) =>
        index === 0 ? { ...carton, grossWeightBySku: { MASK: 0.4 } } : carton,
      ),
    }),
  ).toBe(false);
  expect(sameAutomaticPacking(withSingleParcel, { ...withSingleParcel, mode: undefined })).toBe(
    false,
  );
  expect(
    sameAutomaticPacking(withSingleParcel, {
      ...withSingleParcel,
      cartons: withSingleParcel.cartons.map((carton, index) =>
        index === 1
          ? { ...carton, partialDimensionsCm: { lengthCm: 31, widthCm: 20, heightCm: 15 } }
          : carton,
      ),
    }),
  ).toBe(false);
});
it.each([
  [1, 1],
  [2, 1],
  [3, 1],
  [5, 1],
  [6, 1],
  [40, 1],
  [41, 2],
  [85, 3],
  [80, 2],
])("quotes %i retail boxes with %i exact packed parcels", (quantity, expectedParcels) => {
  expect(validAutomaticPacking(withSingleParcel)).toBe(true);
  const parcels = packAutomatically(withSingleParcel, quantity, "MASK");
  expect(parcels).toHaveLength(expectedParcels);
  expect(parcels.reduce((sum, parcel) => sum + parcel.boxes, 0)).toBe(quantity);
  expect(
    parcels.filter((parcel) => parcel.boxes === 40).every((parcel) => parcel.weightKg === 9.4),
  ).toBe(true);
  for (const parcel of parcels.filter((parcel) => parcel.boxes > 1 && parcel.boxes < 40))
    expect(parcel.weightKg).toBeCloseTo(parcel.boxes * 0.235 + 0.5);
  for (const parcel of parcels.filter((parcel) => parcel.boxes > 1 && parcel.boxes < 40))
    expect([parcel.lengthInches, parcel.widthInches, parcel.heightInches]).toEqual([
      30 / 2.54,
      20 / 2.54,
      15 / 2.54,
    ]);
  for (const parcel of parcels.filter((parcel) => parcel.boxes === 40))
    expect([parcel.lengthInches, parcel.widthInches, parcel.heightInches]).toEqual([
      52 / 2.54,
      39 / 2.54,
      34 / 2.54,
    ]);
});
it("requires separately measured partial dimensions before an unmatched remainder can be quoted", () => {
  const withoutPartialSize: AutomaticPacking = {
    ...withSingleParcel,
    cartons: withSingleParcel.cartons.map((carton, index) =>
      index === 1
        ? { ...carton, partialDimensionsCm: undefined, partialMaxBoxes: undefined }
        : carton,
    ),
  };
  expect(validAutomaticPacking(withoutPartialSize)).toBe(true);
  for (const quantity of [2, 3, 6, 85])
    expect(() => packAutomatically(withoutPartialSize, quantity, "MASK")).toThrow();
  expect(packAutomatically(withoutPartialSize, 1, "MASK")).toHaveLength(1);
  expect(packAutomatically(withoutPartialSize, 40, "MASK")).toHaveLength(1);
  expect(packAutomatically(withoutPartialSize, 41, "MASK")).toHaveLength(2);
});
it("rejects incomplete or invalid partial dimensions", () => {
  for (const partialDimensionsCm of [
    { lengthCm: 30, widthCm: 0, heightCm: 15 },
    { lengthCm: 30, widthCm: 20, heightCm: NaN },
    { lengthCm: 275, widthCm: 20, heightCm: 15 },
  ])
    expect(
      validAutomaticPacking({
        ...withSingleParcel,
        cartons: withSingleParcel.cartons.map((carton, index) =>
          index === 1 ? { ...carton, partialDimensionsCm } : carton,
        ),
      }),
    ).toBe(false);
});
it("never repeats a one-box profile for a larger order without measured partial-carton inputs", () => {
  const unmeasured = {
    ...withSingleParcel,
    units: grossCarton.units,
    cartons: [withSingleParcel.cartons[0], grossCarton.cartons[0]],
  };
  for (const quantity of [2, 3, 6, 85])
    expect(() => packAutomatically(unmeasured, quantity, "MASK")).toThrow();
  expect(packAutomatically(unmeasured, 41, "MASK")).toHaveLength(2);
});
it("rejects gross cartons with missing, mismatched or invalid variant weights", () => {
  for (const grossWeightBySku of [{}, { MASK: 0 }, { OTHER: 9.4 }, { MASK: 69 }]) {
    expect(
      validAutomaticPacking({
        ...grossCarton,
        cartons: [{ ...grossCarton.cartons[0], grossWeightBySku }],
      }),
    ).toBe(false);
  }
});
it("requires every configured option to have a carton before verification", () => {
  expect(
    validAutomaticPacking({
      ...grossCarton,
      units: [
        ...grossCarton.units,
        { variantSku: "OTHER", weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
      ],
    }),
  ).toBe(false);
});
it.each([1, 5, 40, 41, 80])(
  "packs %i boxes from confirmed capacities without inner or retail dimensions",
  (quantity) => {
    expect(validAutomaticPacking(simple)).toBe(true);
    const parcels = packAutomatically(simple, quantity, "BLUE");
    expect(parcels.reduce((n, p) => n + p.boxes, 0)).toBe(quantity);
    expect(parcels.length).toBe(Math.ceil(quantity / 40));
    expect(parcels.every((p) => p.orientationCm.length === 0)).toBe(true);
  },
);

it.each([
  { sku: "MASK", boxWeightKg: 0.24, tareKg: 1, capacity: 40, dimensions: [52, 39, 34] },
  { sku: "GLOVE-S", boxWeightKg: 0.73, tareKg: 1, capacity: 10, dimensions: [41.5, 27, 25.8] },
  { sku: "GLOVE-M", boxWeightKg: 0.79, tareKg: 1, capacity: 10, dimensions: [41.5, 27, 25.8] },
  { sku: "GLOVE-L", boxWeightKg: 0.85, tareKg: 1, capacity: 10, dimensions: [41.5, 27, 25.8] },
])(
  "quotes $sku quantities as sellable boxes, including packaging once per parcel",
  ({ sku, boxWeightKg, tareKg, capacity, dimensions }) => {
    const packing: AutomaticPacking = {
      verified: true,
      units: [{ variantSku: sku, weightKg: boxWeightKg, lengthCm: 0, widthCm: 0, heightCm: 0 }],
      cartons: [
        {
          name: "Master carton",
          lengthCm: dimensions[0],
          widthCm: dimensions[1],
          heightCm: dimensions[2],
          innerLengthCm: 0,
          innerWidthCm: 0,
          innerHeightCm: 0,
          tareKg,
          maxWeightKg: 68,
          capacityBySku: { [sku]: capacity },
        },
      ],
    };
    expect(validAutomaticPacking(packing)).toBe(true);
    for (const quantity of [1, 5, capacity, capacity + 1, capacity * 2]) {
      const parcels = packAutomatically(packing, quantity, sku);
      expect(parcels).toHaveLength(Math.ceil(quantity / capacity));
      expect(parcels.reduce((total, parcel) => total + parcel.boxes, 0)).toBe(quantity);
      expect(parcels.reduce((total, parcel) => total + parcel.weightKg, 0)).toBeCloseTo(
        quantity * boxWeightKg + parcels.length * tareKg,
      );
      for (const parcel of parcels) {
        expect(parcel.boxes).toBeLessThanOrEqual(capacity);
        expect(parcel.weightKg).toBeCloseTo(parcel.boxes * boxWeightKg + tareKg);
        expect(parcel.weightPounds * 0.45359237).toBeGreaterThanOrEqual(parcel.weightKg);
        expect(
          [parcel.lengthInches, parcel.widthInches, parcel.heightInches].map(Math.ceil),
        ).toEqual(dimensions.map((dimension) => Math.ceil(dimension / 2.54)));
      }
    }
  },
);
it("rejects overweight, fractional, unknown-SKU, and empty capacities", () => {
  for (const capacityBySku of [{ BLUE: 999 }, { BLUE: 1.5 }, { BLACK: 10 }, {}]) {
    expect(
      validAutomaticPacking({ ...simple, cartons: [{ ...simple.cartons[0], capacityBySku }] }),
    ).toBe(false);
  }
});
it.each([1, 5, 39, 40, 41, 80, 81, 999])(
  "packs %i boxes without quantity-specific profiles",
  (quantity) => {
    const parcels = packAutomatically(config, quantity, "BLUE");
    expect(parcels.reduce((n, p) => n + p.boxes, 0)).toBe(quantity);
    expect(parcels.length).toBe(Math.ceil(quantity / 40));
    for (const p of parcels) {
      const carton = config.cartons.find((c) => c.name === p.name)!;
      expect(p.boxes).toBeLessThanOrEqual(cartonFit(config.units[0], carton).capacity);
      expect(p.weightKg).toBeCloseTo(p.boxes * 0.2 + carton.tareKg);
      expect(p.weightPounds * 0.45359237).toBeGreaterThanOrEqual(p.weightKg);
    }
  },
);
it("chooses the smaller fitting carton for one box", () =>
  expect(packAutomatically(config, 1, "BLUE")[0].name).toBe("Small"));
it("uses rotations rather than volume alone", () => {
  expect(
    cartonFit({ ...config.units[0], lengthCm: 5, widthCm: 2, heightCm: 10 }, config.cartons[0])
      .capacity,
  ).toBe(1);
  expect(
    cartonFit({ ...config.units[0], lengthCm: 11, widthCm: 1, heightCm: 1 }, config.cartons[0])
      .capacity,
  ).toBe(0);
});
it("limits capacity by loaded weight including tare", () => {
  const limited = { ...config, cartons: [{ ...config.cartons[1], maxWeightKg: 1.5 }] };
  const parcels = packAutomatically(limited, 6, "BLUE");
  expect(parcels.length).toBe(2);
  expect(parcels.every((p) => p.weightKg <= 1.5)).toBe(true);
});
it("does not mix or substitute variants", () =>
  expect(() => packAutomatically(config, 1, "BLACK")).toThrow());
it("rejects missing or unverified configuration", () => {
  expect(() => packAutomatically(null, 1, "BLUE")).toThrow();
  expect(() => packAutomatically({ ...config, verified: false }, 1, "BLUE")).toThrow();
});
it("rejects inconsistent dimensions, duplicate SKUs, and nonfinite weights", () => {
  expect(validAutomaticPacking({ ...config, units: [config.units[0], config.units[0]] })).toBe(
    false,
  );
  expect(
    validAutomaticPacking({ ...config, cartons: [{ ...config.cartons[0], innerLengthCm: 99 }] }),
  ).toBe(false);
  expect(validAutomaticPacking({ ...config, units: [{ ...config.units[0], weightKg: NaN }] })).toBe(
    false,
  );
});
it("enforces quantity limits", () => {
  for (const n of [0, -1, 1.5, 1000]) expect(() => packAutomatically(config, n, "BLUE")).toThrow();
});

it("never overfills weight or geometric limits across different capacities", () => {
  for (const maxWeightKg of [0.9, 1.5, 3.7, 15]) {
    const settings = { ...config, cartons: [{ ...config.cartons[1], maxWeightKg }] };
    const fit = cartonFit(settings.units[0], settings.cartons[0]);
    for (const quantity of [1, 7, 40, 81]) {
      const parcels = packAutomatically(settings, quantity, "BLUE");
      expect(parcels.reduce((sum, p) => sum + p.boxes, 0)).toBe(quantity);
      expect(parcels.every((p) => p.boxes <= fit.capacity && p.weightKg <= maxWeightKg)).toBe(true);
    }
  }
});
