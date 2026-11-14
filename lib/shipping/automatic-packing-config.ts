import { wholeInches } from "./measurements";

export type BoxMeasurements = {
  variantSku: string;
  /** Measured sellable box, including retail packaging but excluding the shipping carton. */
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};
export type ShippingCarton = {
  /** Packed weight for the exact box count in capacityBySku, by sellable-box SKU. */
  grossWeightBySku?: Record<string, number>;
  /** Exact parcel box count in carton_gross mode; legacy mode treats this as capacity. */
  capacityBySku?: Record<string, number>;
  name: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** Measured outside size used only for remainders without an exact parcel profile. */
  partialDimensionsCm?: { lengthCm: number; widthCm: number; heightCm: number };
  /** Maximum sellable boxes physically verified to fit in the partial-order parcel. */
  partialMaxBoxes?: number;
  /** Empty outer shipping carton, tape and padding for a partial shipment. */
  tareKg: number;
  maxWeightKg: number;
};
export type AutomaticPacking = {
  mode?: "carton_gross";
  strategy?: "measured_parcels" | "cartons_and_singles";
  units: BoxMeasurements[];
  cartons: ShippingCarton[];
  verified: boolean;
};
export const emptyAutomaticPacking: AutomaticPacking = {
  mode: "carton_gross",
  units: [],
  cartons: [],
  verified: false,
};

/** Prepare the editor without treating carton-derived per-box estimates as measured weights. */
export function cartonGrossDraft(value: AutomaticPacking): AutomaticPacking {
  if (value.mode === "carton_gross") return value;
  return {
    mode: "carton_gross",
    verified: false,
    units: value.units.map(({ variantSku }) => ({
      variantSku,
      weightKg: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
    })),
    cartons: value.cartons.map((carton) => ({
      name: carton.name,
      lengthCm: carton.lengthCm,
      widthCm: carton.widthCm,
      heightCm: carton.heightCm,
      innerLengthCm: 0,
      innerWidthCm: 0,
      innerHeightCm: 0,
      tareKg: 0,
      maxWeightKg: 68,
      capacityBySku: { ...carton.capacityBySku },
      grossWeightBySku: {},
    })),
  };
}
const positive = (n: unknown, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= max;
export function validAutomaticPacking(value: unknown): value is AutomaticPacking {
  if (!value || typeof value !== "object") return false;
  const p = value as AutomaticPacking;
  if (
    p.strategy !== undefined &&
    (!["measured_parcels", "cartons_and_singles"].includes(p.strategy) || p.mode !== "carton_gross")
  )
    return false;
  if (
    p.strategy === "measured_parcels" &&
    Array.isArray(p.cartons) &&
    p.cartons.some(
      (carton) =>
        carton?.partialDimensionsCm !== undefined ||
        carton?.partialMaxBoxes !== undefined ||
        carton?.tareKg !== 0,
    )
  )
    return false;
  if (p.mode === "carton_gross") {
    if (
      typeof p.verified !== "boolean" ||
      !Array.isArray(p.units) ||
      p.units.length > 100 ||
      !Array.isArray(p.cartons) ||
      p.cartons.length > 12 ||
      (p.verified && (!p.units.length || !p.cartons.length))
    )
      return false;
    const skus = p.units.map((u) => u?.variantSku) as string[];
    if (
      skus.some((sku) => typeof sku !== "string" || sku.length > 80) ||
      new Set(skus).size !== skus.length ||
      p.units.some((u) => !u || !Number.isFinite(u.weightKg) || u.weightKg < 0 || u.weightKg > 68)
    )
      return false;
    if (
      p.verified &&
      skus.some(
        (sku) =>
          !p.cartons.some(
            (carton) =>
              carton?.capacityBySku &&
              Object.prototype.hasOwnProperty.call(carton.capacityBySku, sku),
          ),
      )
    )
      return false;
    return p.cartons.every((c) => {
      if (
        !c ||
        typeof c.name !== "string" ||
        !c.name.trim() ||
        c.name.length > 80 ||
        ![c.lengthCm, c.widthCm, c.heightCm].every((n) => positive(n, 274)) ||
        !c.capacityBySku ||
        !c.grossWeightBySku ||
        !Number.isFinite(c.tareKg) ||
        c.tareKg < 0 ||
        c.tareKg > 68 ||
        typeof c.capacityBySku !== "object" ||
        typeof c.grossWeightBySku !== "object" ||
        Array.isArray(c.capacityBySku) ||
        Array.isArray(c.grossWeightBySku)
      )
        return false;
      const capacities = Object.entries(c.capacityBySku);
      const partial = c.partialDimensionsCm;
      if (partial !== undefined) {
        const maxPartialBoxes = c.partialMaxBoxes;
        if (
          !partial ||
          typeof partial !== "object" ||
          Array.isArray(partial) ||
          ![partial.lengthCm, partial.widthCm, partial.heightCm].every((n) => positive(n, 274)) ||
          !Number.isInteger(maxPartialBoxes) ||
          maxPartialBoxes! < 1 ||
          maxPartialBoxes! >= Math.max(...capacities.map(([, count]) => count))
        )
          return false;
        const partialInches = [partial.lengthCm, partial.widthCm, partial.heightCm].map((n) =>
          wholeInches(n / 2.54),
        );
        if (
          Math.max(...partialInches) > 108 ||
          2 * partialInches.reduce((a, b) => a + b, 0) - Math.max(...partialInches) > 165 ||
          c.tareKg <= 0 ||
          capacities.some(([sku]) => {
            const boxWeight = p.units.find((u) => u.variantSku === sku)?.weightKg;
            return !positive(boxWeight, 68) || boxWeight * maxPartialBoxes! + c.tareKg > 68;
          })
        )
          return false;
      }
      if (partial === undefined && c.partialMaxBoxes !== undefined) return false;
      if (
        !capacities.length ||
        capacities.length > 100 ||
        Object.keys(c.grossWeightBySku).length !== capacities.length ||
        !capacities.every(
          ([sku, count]) =>
            skus.includes(sku) &&
            Number.isInteger(count) &&
            count > 0 &&
            count <= 999 &&
            positive(c.grossWeightBySku![sku], 68),
        )
      )
        return false;
      const d = [c.lengthCm, c.widthCm, c.heightCm].map((n) => wholeInches(n / 2.54));
      return Math.max(...d) <= 108 && 2 * d.reduce((a, b) => a + b, 0) - Math.max(...d) <= 165;
    });
  }
  const capacityMode =
    Array.isArray(p.cartons) &&
    p.cartons.length > 0 &&
    p.cartons.every((c) => c?.capacityBySku !== undefined);
  if (
    Array.isArray(p.cartons) &&
    p.cartons.some((c) => c?.capacityBySku !== undefined) &&
    !capacityMode
  )
    return false;
  return (
    typeof p.verified === "boolean" &&
    Array.isArray(p.units) &&
    p.units.length <= 100 &&
    Array.isArray(p.cartons) &&
    p.cartons.length <= 12 &&
    (!p.verified || (p.units.length > 0 && p.cartons.length > 0)) &&
    p.units.every(
      (u) =>
        u &&
        typeof u.variantSku === "string" &&
        u.variantSku.length <= 80 &&
        positive(u.weightKg, 68) &&
        (capacityMode || [u.lengthCm, u.widthCm, u.heightCm].every((n) => positive(n, 274))),
    ) &&
    new Set(p.units.map((u) => u.variantSku)).size === p.units.length &&
    p.cartons.every(
      (c) =>
        c &&
        typeof c.name === "string" &&
        c.name.trim().length > 0 &&
        c.name.length <= 80 &&
        positive(c.tareKg, 68) &&
        [c.lengthCm, c.widthCm, c.heightCm].every((n) => positive(n, 274)) &&
        (c.capacityBySku !== undefined
          ? c.capacityBySku !== null &&
            typeof c.capacityBySku === "object" &&
            !Array.isArray(c.capacityBySku) &&
            Object.keys(c.capacityBySku).length > 0 &&
            Object.keys(c.capacityBySku).length <= 100 &&
            Object.entries(c.capacityBySku).every(([sku, count]) => {
              const unit = p.units.find((u) => u.variantSku === sku);
              return (
                !!unit &&
                Number.isInteger(count) &&
                count > 0 &&
                count <= 999 &&
                unit.weightKg * count + c.tareKg <= 68
              );
            })
          : positive(c.maxWeightKg, 68) &&
            c.tareKg < c.maxWeightKg &&
            [c.innerLengthCm, c.innerWidthCm, c.innerHeightCm].every((n) => positive(n, 274)) &&
            c.innerLengthCm <= c.lengthCm &&
            c.innerWidthCm <= c.widthCm &&
            c.innerHeightCm <= c.heightCm) &&
        // Match the whole-inch dimensions sent to the carrier.
        (() => {
          const d = [c.lengthCm, c.widthCm, c.heightCm].map((n) => wholeInches(n / 2.54));
          return Math.max(...d) <= 108 && 2 * d.reduce((a, b) => a + b, 0) - Math.max(...d) <= 165;
        })(),
    )
  );
}

/** Gross packing treats the largest exact profile for each SKU as its full carton. */
export function cartonCountMatchesPacking(value: AutomaticPacking, boxesPerCarton: number) {
  if (value.mode !== "carton_gross" || !value.verified || value.strategy === "measured_parcels")
    return true;
  if (!Number.isInteger(boxesPerCarton) || boxesPerCarton < 1) return false;
  return value.units.every((unit) => {
    const largestCount = Math.max(
      0,
      ...value.cartons.map((carton) => carton.capacityBySku?.[unit.variantSku] ?? 0),
    );
    return largestCount === boxesPerCarton;
  });
}

/** A confirmed setup must be able to pack every order size, not just one box and full cartons. */
export function coversAllBoxQuantities(value: AutomaticPacking, boxesPerCarton: number) {
  if (value.strategy === "cartons_and_singles")
    return (
      Number.isInteger(boxesPerCarton) &&
      boxesPerCarton >= 1 &&
      value.units.length > 0 &&
      value.units.every((unit) => {
        const counts = value.cartons
          .map((carton) => carton.capacityBySku?.[unit.variantSku])
          .filter((count) => count !== undefined);
        const full = value.cartons.find(
          (carton) => carton.capacityBySku?.[unit.variantSku] === boxesPerCarton,
        );
        return (
          counts.length === (boxesPerCarton === 1 ? 1 : 2) &&
          counts.includes(1) &&
          counts.includes(boxesPerCarton) &&
          (boxesPerCarton <= 2 ||
            Boolean(
              unit.weightKg > 0 &&
              full?.partialDimensionsCm &&
              full.partialMaxBoxes &&
              full.partialMaxBoxes >= 2 &&
              full.tareKg > 0,
            ))
        );
      })
    );
  if (value.strategy === "measured_parcels")
    return (
      value.units.length > 0 &&
      value.units.every((unit) =>
        value.cartons.some((carton) => carton.capacityBySku?.[unit.variantSku] === 1),
      )
    );
  if (value.mode !== "carton_gross" || !Number.isInteger(boxesPerCarton) || boxesPerCarton < 1)
    return false;
  return value.units.every((unit) => {
    const profiles = value.cartons.filter(
      (carton) => (carton.capacityBySku?.[unit.variantSku] ?? 0) > 0,
    );
    const counts = new Set(profiles.map((carton) => carton.capacityBySku![unit.variantSku]));
    if (!counts.has(boxesPerCarton)) return false;
    if (boxesPerCarton === 1) return true;
    if (
      Array.from({ length: boxesPerCarton - 1 }, (_, index) => index + 1).every((count) =>
        counts.has(count),
      )
    )
      return true;
    const full = profiles.find(
      (carton) => carton.capacityBySku![unit.variantSku] === boxesPerCarton,
    );
    return Boolean(
      full?.partialDimensionsCm &&
      full.partialMaxBoxes &&
      full.partialMaxBoxes >= 1 &&
      full.tareKg > 0 &&
      unit.weightKg > 0,
    );
  });
}
