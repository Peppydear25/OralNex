import { cartonGrossDraft, type AutomaticPacking, type ShippingCarton } from "./automatic-packing";

const KG_PER_POUND = 0.45359237;

// Retain the database's existing measurement contract; all new input/output uses inches and lb.
export const poundsToKg = (pounds: number) => Number((pounds * KG_PER_POUND).toFixed(12));
export const kgToPounds = (kg: number) => Number((kg / KG_PER_POUND).toFixed(6));
export const inchesToCm = (inches: number) => Number((inches * 2.54).toFixed(10));
export const cmToInches = (cm: number) => Number((cm / 2.54).toFixed(6));

export function parsePackageSize(text: string) {
  const parts = text.trim().split(/\s*[x×]\s*/i);
  if (parts.length !== 3 || parts.some((part) => !/^\d+(?:\.\d+)?$/.test(part))) return null;
  const dimensions = parts.map(Number);
  if (
    dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0 || dimension > 108)
  )
    return null;
  return {
    lengthCm: inchesToCm(dimensions[0]),
    widthCm: inchesToCm(dimensions[1]),
    heightCm: inchesToCm(dimensions[2]),
  };
}

export function packageSize(carton: ShippingCarton) {
  return [carton.lengthCm, carton.widthCm, carton.heightCm].every((n) => n > 0)
    ? [carton.lengthCm, carton.widthCm, carton.heightCm].map(cmToInches).join(" × ")
    : "";
}

export function newMeasuredPackage(sku: string, boxes: number): ShippingCarton {
  return {
    name: "Measured shipping package",
    lengthCm: 0,
    widthCm: 0,
    heightCm: 0,
    innerLengthCm: 0,
    innerWidthCm: 0,
    innerHeightCm: 0,
    tareKg: 0,
    maxWeightKg: 68,
    capacityBySku: { [sku]: boxes },
    grossWeightBySku: {},
  };
}

/** Replace old estimates with measured presets without modifying the saved product on open. */
export function measuredPackagesDraft(value: AutomaticPacking): AutomaticPacking {
  if (value.strategy === "measured_parcels" || value.strategy === "cartons_and_singles")
    return value;
  const draft = cartonGrossDraft(value);
  return {
    mode: "carton_gross",
    strategy: "measured_parcels",
    verified: false,
    units: draft.units.map((unit) => ({
      ...unit,
      weightKg: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
    })),
    cartons: draft.cartons
      .filter((carton) =>
        Object.keys(carton.capacityBySku ?? {}).some((sku) =>
          draft.units.some((unit) => unit.variantSku === sku),
        ),
      )
      .map((carton) => ({
        ...carton,
        tareKg: 0,
        partialDimensionsCm: undefined,
        partialMaxBoxes: undefined,
      })),
  };
}

/** Keep only the measured single and full carton. Changing carton capacity needs new measurements. */
export function cartonsAndSinglesDraft(
  value: AutomaticPacking,
  boxesPerCarton: number,
): AutomaticPacking {
  const draft = measuredPackagesDraft(value);
  const counts = boxesPerCarton === 1 ? [1] : [1, boxesPerCarton];
  const cartons = draft.units.flatMap((unit) =>
    counts.map((count) => {
      const existing = draft.cartons.find(
        (carton) => carton.capacityBySku?.[unit.variantSku] === count,
      );
      return existing
        ? {
            ...existing,
            capacityBySku: { [unit.variantSku]: count },
            grossWeightBySku: existing.grossWeightBySku?.[unit.variantSku]
              ? { [unit.variantSku]: existing.grossWeightBySku[unit.variantSku] }
              : {},
          }
        : newMeasuredPackage(unit.variantSku, count);
    }),
  );
  return {
    ...draft,
    strategy: "cartons_and_singles",
    cartons,
    verified:
      value.strategy === "cartons_and_singles" &&
      value.verified &&
      cartons.length === value.cartons.length &&
      counts.every((count) =>
        value.units.every((unit) =>
          value.cartons.some((carton) => carton.capacityBySku?.[unit.variantSku] === count),
        ),
      ),
  };
}
