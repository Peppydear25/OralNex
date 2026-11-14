/** A measured, repeatable parcel containing an EXACT number of one variant's boxes. */
export type PackageProfile = {
  name: string;
  variantSku: string;
  boxes: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  verified: boolean;
};

export class ShippingQuoteRequired extends Error {
  constructor() {
    super(
      "Shipping needs confirmation for this order. Contact us for a shipping quote before payment.",
    );
  }
}

export function validPackageProfiles(value: unknown): value is PackageProfile[] {
  return (
    Array.isArray(value) &&
    value.length <= 30 &&
    value.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.name === "string" &&
        p.name.trim().length > 0 &&
        p.name.length <= 80 &&
        typeof p.variantSku === "string" &&
        p.variantSku.length <= 80 &&
        typeof p.verified === "boolean" &&
        Number.isInteger(p.boxes) &&
        p.boxes >= 1 &&
        p.boxes <= 999 &&
        typeof p.weightKg === "number" &&
        Number.isFinite(p.weightKg) &&
        p.weightKg > 0 &&
        p.weightKg <= 68 &&
        [p.lengthCm, p.widthCm, p.heightCm].every(
          (n) => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 274,
        ) &&
        Math.max(p.lengthCm, p.widthCm, p.heightCm) +
          2 * (p.lengthCm + p.widthCm + p.heightCm - Math.max(p.lengthCm, p.widthCm, p.heightCm)) <=
          419,
    )
  );
}

/** Minimize parcel count, not price. No guessed partial cartons or mixed-variant packing. */
export function planPackages(value: unknown, quantity: number, variantSku: string) {
  if (
    !validPackageProfiles(value) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  ) {
    throw new ShippingQuoteRequired();
  }
  const profiles = value.filter((p) => p.verified && p.variantSku === variantSku);
  const counts = Array<number>(quantity + 1).fill(Infinity);
  const chosen = Array<number>(quantity + 1).fill(-1);
  counts[0] = 0;
  for (let total = 1; total <= quantity; total++) {
    profiles.forEach((p, index) => {
      if (p.boxes <= total && counts[total - p.boxes] + 1 < counts[total]) {
        counts[total] = counts[total - p.boxes] + 1;
        chosen[total] = index;
      }
    });
  }
  if (!Number.isFinite(counts[quantity]) || counts[quantity] > 100)
    throw new ShippingQuoteRequired();
  const groups = new Map<number, number>();
  for (let remaining = quantity; remaining > 0;) {
    const index = chosen[remaining];
    groups.set(index, (groups.get(index) ?? 0) + 1);
    remaining -= profiles[index].boxes;
  }
  return [...groups].map(([index, groupPackageCount]) => {
    const p = profiles[index];
    return {
      // Round weight UP to 0.01 lb, so conversion cannot understate the measured weight.
      weightPounds: Math.ceil((p.weightKg / 0.45359237) * 100) / 100,
      lengthInches: p.lengthCm / 2.54,
      widthInches: p.widthCm / 2.54,
      heightInches: p.heightCm / 2.54,
      groupPackageCount,
    };
  });
}
