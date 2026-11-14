import { wholeInches } from "./measurements";
import { ShippingQuoteRequired } from "./package-profiles";
import {
  validAutomaticPacking,
  type AutomaticPacking,
  type BoxMeasurements,
  type ShippingCarton,
} from "./automatic-packing-config";

export {
  cartonCountMatchesPacking,
  cartonGrossDraft,
  coversAllBoxQuantities,
  emptyAutomaticPacking,
  validAutomaticPacking,
} from "./automatic-packing-config";
export type { AutomaticPacking, BoxMeasurements, ShippingCarton } from "./automatic-packing-config";
export function cartonFit(unit: BoxMeasurements, carton: ShippingCarton) {
  if (carton.capacityBySku !== undefined) {
    return {
      capacity: carton.capacityBySku[unit.variantSku] ?? 0,
      orientationCm: [] as number[],
      grid: [] as number[],
    };
  }
  const [a, b, c] = [unit.lengthCm, unit.widthCm, unit.heightCm];
  const orientations = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
  let fit = { capacity: 0, orientationCm: orientations[0], grid: [0, 0, 0] };
  for (const dimensions of orientations) {
    // Integer micrometres avoid float under-counts at exact fits; round usable space down.
    const grid = [carton.innerLengthCm, carton.innerWidthCm, carton.innerHeightCm].map((n, i) =>
      Math.floor(Math.floor(n * 10000) / Math.ceil(dimensions[i] * 10000)),
    );
    const capacity = Math.min(
      999,
      grid[0] * grid[1] * grid[2],
      Math.floor(
        (Math.floor(carton.maxWeightKg * 1e6) - Math.ceil(carton.tareKg * 1e6)) /
          Math.ceil(unit.weightKg * 1e6),
      ),
    );
    if (capacity > fit.capacity) fit = { capacity, orientationCm: dimensions, grid };
  }
  return fit;
}

function grossParcel(
  carton: ShippingCarton,
  sku: string,
  boxes: number,
  weightKg: number,
  dimensions: Pick<ShippingCarton, "lengthCm" | "widthCm" | "heightCm"> = carton,
) {
  return {
    name: carton.name,
    variantSku: sku,
    boxes,
    weightKg,
    orientationCm: [] as number[],
    grid: [] as number[],
    weightPounds: wholeInches((weightKg / 0.45359237) * 100) / 100,
    lengthInches: dimensions.lengthCm / 2.54,
    widthInches: dimensions.widthCm / 2.54,
    heightInches: dimensions.heightCm / 2.54,
    groupPackageCount: 1,
  };
}

/** Full cartons plus as many measured partial parcels as the physical capacity requires. */
function packGrossCartons(value: AutomaticPacking, quantity: number, unit: BoxMeasurements) {
  const sku = unit.variantSku;
  const profiles = value.cartons.filter((carton) => (carton.capacityBySku?.[sku] ?? 0) > 0);
  const full = profiles.reduce<ShippingCarton | undefined>(
    (largest, carton) =>
      !largest || carton.capacityBySku![sku] > largest.capacityBySku![sku] ? carton : largest,
    undefined,
  );
  if (!full) throw new ShippingQuoteRequired();
  const capacity = full.capacityBySku![sku];
  const fullCount = Math.floor(quantity / capacity);
  const remainder = quantity - fullCount * capacity;
  const parcels = Array.from({ length: fullCount }, () =>
    grossParcel(full, sku, capacity, full.grossWeightBySku![sku]),
  );
  let unpacked = remainder;
  while (unpacked > 0) {
    const exact = profiles.find((carton) => carton.capacityBySku![sku] === unpacked);
    if (exact) {
      parcels.push(grossParcel(exact, sku, unpacked, exact.grossWeightBySku![sku]));
      break;
    }
    const partialMax = full.partialMaxBoxes ?? 0;
    const count = Math.min(unpacked, partialMax);
    const matching = profiles.find((carton) => carton.capacityBySku![sku] === count);
    if (matching) {
      parcels.push(grossParcel(matching, sku, count, matching.grossWeightBySku![sku]));
    } else if (count >= 1 && unit.weightKg > 0 && full.tareKg > 0 && full.partialDimensionsCm) {
      const weightKg =
        (Math.ceil(unit.weightKg * 1e6) * count + Math.ceil(full.tareKg * 1e6)) / 1e6;
      if (weightKg > 68) throw new ShippingQuoteRequired();
      parcels.push(grossParcel(full, sku, count, weightKg, full.partialDimensionsCm));
    } else {
      throw new ShippingQuoteRequired();
    }
    unpacked -= count;
    if (parcels.length > 100) throw new ShippingQuoteRequired();
  }
  if (!parcels.length || parcels.length > 100) throw new ShippingQuoteRequired();
  return parcels;
}

/** The saved strategy name is retained, but remainders now need measured partial parcels. */
function packCartonsAndSingles(value: AutomaticPacking, quantity: number, sku: string) {
  const choices = value.cartons.filter((carton) => (carton.capacityBySku?.[sku] ?? 0) > 0);
  const single = choices.find((carton) => carton.capacityBySku![sku] === 1);
  const full = choices.find((carton) => carton.capacityBySku![sku] > 1);
  if (!single || choices.length !== (full ? 2 : 1)) throw new ShippingQuoteRequired();
  const capacity = full?.capacityBySku![sku] ?? 1;
  const cartons = full ? Math.floor(quantity / capacity) : 0;
  let remainder = quantity - cartons * capacity;
  const parcels = [
    ...Array.from({ length: cartons }, () =>
      grossParcel(full!, sku, capacity, full!.grossWeightBySku![sku]),
    ),
  ];
  if (!full) {
    if (remainder > 100) throw new ShippingQuoteRequired();
    return Array.from({ length: remainder }, () =>
      grossParcel(single, sku, 1, single.grossWeightBySku![sku]),
    );
  }
  while (remainder > 0) {
    if (remainder === 1) {
      parcels.push(grossParcel(single, sku, 1, single.grossWeightBySku![sku]));
      break;
    }
    const maxBoxes = full?.partialMaxBoxes ?? 0;
    const dimensions = full?.partialDimensionsCm;
    const unit = value.units.find((item) => item.variantSku === sku);
    if (maxBoxes < 2 || !dimensions || !unit?.weightKg || !full?.tareKg)
      throw new ShippingQuoteRequired();
    const boxes = Math.min(remainder, maxBoxes);
    const weightKg = (Math.ceil(unit.weightKg * 1e6) * boxes + Math.ceil(full.tareKg * 1e6)) / 1e6;
    if (weightKg > 68) throw new ShippingQuoteRequired();
    parcels.push(
      grossParcel({ ...full, name: "Smaller parcel" }, sku, boxes, weightKg, dimensions),
    );
    remainder -= boxes;
    if (parcels.length > 100) throw new ShippingQuoteRequired();
  }
  return parcels;
}

/** Use exact measured presets. Minimize parcel count, then rounded shipping volume. */
function packMeasuredPackages(value: AutomaticPacking, quantity: number, sku: string) {
  const choices = value.cartons.filter((carton) => (carton.capacityBySku?.[sku] ?? 0) > 0);
  const best = Array.from({ length: quantity + 1 }, () => ({
    count: Infinity,
    volume: Infinity,
    choice: -1,
  }));
  best[0] = { count: 0, volume: 0, choice: -1 };
  for (let boxes = 1; boxes <= quantity; boxes++) {
    choices.forEach((carton, index) => {
      const count = carton.capacityBySku![sku];
      if (count > boxes) return;
      const previous = best[boxes - count];
      const volume = [carton.lengthCm, carton.widthCm, carton.heightCm]
        .map((cm) => wholeInches(cm / 2.54))
        .reduce((a, b) => a * b, 1);
      const candidate = {
        count: previous.count + 1,
        volume: previous.volume + volume,
        choice: index,
      };
      if (
        candidate.count < best[boxes].count ||
        (candidate.count === best[boxes].count && candidate.volume < best[boxes].volume)
      )
        best[boxes] = candidate;
    });
  }
  if (!Number.isFinite(best[quantity].count) || best[quantity].count > 100)
    throw new ShippingQuoteRequired();
  const parcels = [];
  for (let remaining = quantity; remaining > 0;) {
    const carton = choices[best[remaining].choice];
    const boxes = carton.capacityBySku![sku];
    parcels.push(grossParcel(carton, sku, boxes, carton.grossWeightBySku![sku]));
    remaining -= boxes;
  }
  return parcels;
}

/** Pack each SKU separately; gross-weight profiles describe exact packed quantities. */
export function packAutomatically(value: unknown, quantity: number, sku: string) {
  if (
    !validAutomaticPacking(value) ||
    !value.verified ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  )
    throw new ShippingQuoteRequired();
  const unit = value.units.find((u) => u.variantSku === sku);
  if (!unit) throw new ShippingQuoteRequired();
  if (value.strategy === "cartons_and_singles") return packCartonsAndSingles(value, quantity, sku);
  if (value.strategy === "measured_parcels") return packMeasuredPackages(value, quantity, sku);
  if (value.mode === "carton_gross") return packGrossCartons(value, quantity, unit);
  const choices = value.cartons
    .map((carton) => ({ carton, ...cartonFit(unit, carton) }))
    .filter((c) => c.capacity > 0);
  const costs = Array.from({ length: quantity + 1 }, () => ({
    count: Infinity,
    volume: Infinity,
    index: -1,
    boxes: 0,
  }));
  costs[0] = { count: 0, volume: 0, index: -1, boxes: 0 };
  for (let n = 1; n <= quantity; n++)
    choices.forEach((choice, index) => {
      const volume = choice.carton.lengthCm * choice.carton.widthCm * choice.carton.heightCm;
      for (let boxes = 1; boxes <= Math.min(n, choice.capacity); boxes++) {
        const previous = costs[n - boxes];
        const count = previous.count + 1;
        const totalVolume = previous.volume + volume;
        if (count < costs[n].count || (count === costs[n].count && totalVolume < costs[n].volume))
          costs[n] = { count, volume: totalVolume, index, boxes };
      }
    });
  if (!Number.isFinite(costs[quantity].count) || costs[quantity].count > 100)
    throw new ShippingQuoteRequired();
  const parcels = [];
  for (let remaining = quantity; remaining > 0;) {
    const step = costs[remaining];
    const choice = choices[step.index];
    const c = choice.carton;
    const weightKg =
      (Math.ceil(unit.weightKg * 1e6) * step.boxes + Math.ceil(c.tareKg * 1e6)) / 1e6;
    parcels.push({
      name: c.name,
      variantSku: sku,
      boxes: step.boxes,
      weightKg,
      orientationCm: choice.orientationCm,
      grid: choice.grid,
      weightPounds: wholeInches((weightKg / 0.45359237) * 100) / 100,
      lengthInches: c.lengthCm / 2.54,
      widthInches: c.widthCm / 2.54,
      heightInches: c.heightCm / 2.54,
      groupPackageCount: 1,
    });
    remaining -= step.boxes;
  }
  return parcels;
}
