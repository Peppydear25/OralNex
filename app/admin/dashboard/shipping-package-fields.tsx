"use client";

import { useId, useState } from "react";
import type { ProductVariant } from "../../data/catalog";
import {
  type AutomaticPacking,
  type ShippingCarton,
  coversAllBoxQuantities,
  cartonCountMatchesPacking,
  validAutomaticPacking,
} from "../../../lib/shipping/automatic-packing";
import {
  kgToPounds,
  newMeasuredPackage,
  cartonsAndSinglesDraft,
  packageSize,
  parsePackageSize,
  poundsToKg,
} from "../../../lib/shipping/measured-packages";

function WeightInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const source = value > 0 ? String(kgToPounds(value)) : "";
  const [input, setInput] = useState({ source, text: source });
  if (input.source !== source) setInput({ source, text: source });
  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]+([.][0-9]+)?"
      placeholder="0.00"
      required
      value={input.text}
      onChange={(event) => {
        const text = event.target.value;
        if (text && !/^\d*\.?\d*$/.test(text)) return;
        const next = Number(text);
        setInput({ source: next > 0 ? String(next) : "", text });
        onChange(next);
      }}
    />
  );
}

function PackageSizeField({
  carton,
  onChange,
  label = "Package size (in)",
}: {
  carton: ShippingCarton;
  onChange: (dimensions: Pick<ShippingCarton, "lengthCm" | "widthCm" | "heightCm">) => void;
  label?: string;
}) {
  const id = useId();
  const source = packageSize(carton);
  const [input, setInput] = useState({ source, text: source });
  // A removed preset can reuse this row; synchronize without overwriting text being typed.
  if (input.source !== source) setInput({ source, text: source });
  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={input.text}
        placeholder="13 × 8 × 4"
        required
        pattern="[0-9]+([.][0-9]+)?\s*[xX×]\s*[0-9]+([.][0-9]+)?\s*[xX×]\s*[0-9]+([.][0-9]+)?"
        onChange={(event) => {
          const next = event.target.value;
          const dimensions = parsePackageSize(next) ?? { lengthCm: 0, widthCm: 0, heightCm: 0 };
          setInput({ source: packageSize({ ...carton, ...dimensions }), text: next });
          onChange(dimensions);
        }}
      />
    </div>
  );
}

type Props = {
  value: AutomaticPacking;
  onChange: (value: AutomaticPacking) => void;
  variants: ProductVariant[];
  boxesPerCarton: number;
  error?: string;
};

export function ShippingPackageFields({ value, onChange, variants, boxesPerCarton, error }: Props) {
  const skus = variants.length ? variants.map((variant) => variant.sku ?? "") : [""];
  const draft = cartonsAndSinglesDraft(value, boxesPerCarton);
  const optionName = (key: string) => {
    const variant = variants.find((item) => item.sku === key);
    return variant ? Object.values(variant.options).join(" / ") || key : key || "This product";
  };
  const update = (changes: Partial<AutomaticPacking>) =>
    onChange({ ...draft, ...changes, verified: false });
  const ready =
    skus.every((key) => draft.units.some((unit) => unit.variantSku === key)) &&
    validAutomaticPacking({ ...draft, verified: true }) &&
    cartonCountMatchesPacking({ ...draft, verified: true }, boxesPerCarton) &&
    coversAllBoxQuantities(draft, boxesPerCarton);
  return (
    <section
      id="product-editor-shipping"
      className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 max-sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-lg font-semibold">EasyPost shipping setup</h3>
          <p className="mt-1 text-sm text-slate-600">
            Set up the parcels you actually ship. Checkout uses these measurements for live carrier
            rates.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.verified && ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
        >
          {draft.verified && ready
            ? "Measurements confirmed"
            : ready
              ? "Ready to confirm"
              : "Setup needed"}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Customers order by box · {boxesPerCarton} boxes make a full carton · Enter pounds and
        outside dimensions in inches.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {skus.map((key) => {
        const entries = draft.cartons
          .map((carton, index) => ({ carton, index }))
          .filter(({ carton }) => carton.capacityBySku?.[key] !== undefined);
        return (
          <div
            key={key}
            className="grid min-w-0 gap-5 rounded-xl border border-slate-200 p-5 max-sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h4 className="font-semibold">{optionName(key)}</h4>
              <span className="text-xs text-slate-500">Product option</span>
            </div>
            {boxesPerCarton > 2 && entries.length > 0 && (
              <label className="grid max-w-sm gap-1 text-sm">
                <span>Weight of one sellable box (lb)</span>
                <WeightInput
                  value={draft.units.find((unit) => unit.variantSku === key)?.weightKg ?? 0}
                  onChange={(pounds) =>
                    update({
                      units: draft.units.map((unit) =>
                        unit.variantSku === key ? { ...unit, weightKg: poundsToKg(pounds) } : unit,
                      ),
                    })
                  }
                />
                <span className="text-xs font-normal text-slate-500">
                  Box and contents only; the outer parcel is entered below.
                </span>
              </label>
            )}
            {entries.length === 0 && (
              <button
                type="button"
                className="w-fit text-sm font-semibold text-cyan-800"
                disabled={draft.cartons.length + (boxesPerCarton === 1 ? 1 : 2) > 12}
                onClick={() =>
                  update({
                    units: [
                      ...draft.units,
                      { variantSku: key, weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
                    ],
                    cartons: [
                      ...draft.cartons,
                      ...[...new Set([1, boxesPerCarton])].map((count) =>
                        newMeasuredPackage(key, count),
                      ),
                    ],
                  })
                }
              >
                Set up shipping
              </button>
            )}
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {entries.map(({ carton, index }) => (
                <fieldset
                  key={`${key}:${index}:${carton.capacityBySku?.[key]}`}
                  className="grid min-w-0 content-start gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <legend className="px-1 text-sm font-semibold">
                    {carton.capacityBySku?.[key] === 1
                      ? "1 box ordered"
                      : `Full carton · ${boxesPerCarton} boxes`}
                  </legend>
                  <p className="text-xs leading-5 text-slate-500">
                    {carton.capacityBySku?.[key] === 1
                      ? "The sealed parcel containing one sellable box."
                      : "The sealed full carton handed to the carrier."}
                  </p>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <label>
                      <span>Sealed weight (lb)</span>
                      <WeightInput
                        value={carton.grossWeightBySku?.[key] ?? 0}
                        onChange={(pounds) =>
                          update({
                            cartons: draft.cartons.map((current, i) =>
                              i === index
                                ? {
                                    ...current,
                                    grossWeightBySku: {
                                      ...current.grossWeightBySku,
                                      [key]: poundsToKg(pounds),
                                    },
                                  }
                                : current,
                            ),
                          })
                        }
                      />
                    </label>
                    <PackageSizeField
                      carton={carton}
                      label="Outside size (L × W × H, in)"
                      onChange={(dimensions) =>
                        update({
                          cartons: draft.cartons.map((current, i) =>
                            i === index ? { ...current, ...dimensions } : current,
                          ),
                        })
                      }
                    />
                  </div>
                </fieldset>
              ))}
            </div>
            {boxesPerCarton > 2 &&
              entries
                .filter(({ carton }) => carton.capacityBySku?.[key] === boxesPerCarton)
                .map(({ carton, index }) => (
                  <section
                    key={`partial:${key}`}
                    className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-semibold">
                        Partial orders · 2–{boxesPerCarton - 1} boxes
                      </h5>
                      {(!carton.partialMaxBoxes ||
                        !carton.tareKg ||
                        !carton.partialDimensionsCm) && (
                        <span className="text-xs font-medium text-amber-800">
                          Measurements needed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      For 2–{boxesPerCarton - 1} boxes, checkout adds the box weights to this empty
                      parcel and sends its outside size to EasyPost.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label>
                        <span>Boxes that fit in this parcel</span>
                        <input
                          type="number"
                          min="2"
                          max={boxesPerCarton - 1}
                          step="1"
                          required
                          value={carton.partialMaxBoxes ?? ""}
                          onChange={(event) =>
                            update({
                              cartons: draft.cartons.map((current, i) =>
                                i === index
                                  ? {
                                      ...current,
                                      partialMaxBoxes: Number(event.target.value) || undefined,
                                    }
                                  : current,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Empty parcel + padding (lb)</span>
                        <WeightInput
                          value={carton.tareKg ?? 0}
                          onChange={(pounds) =>
                            update({
                              cartons: draft.cartons.map((current, i) =>
                                i === index ? { ...current, tareKg: poundsToKg(pounds) } : current,
                              ),
                            })
                          }
                        />
                      </label>
                      <PackageSizeField
                        carton={{
                          ...carton,
                          lengthCm: carton.partialDimensionsCm?.lengthCm ?? 0,
                          widthCm: carton.partialDimensionsCm?.widthCm ?? 0,
                          heightCm: carton.partialDimensionsCm?.heightCm ?? 0,
                        }}
                        label="Outside size (L × W × H, in)"
                        onChange={(dimensions) =>
                          update({
                            cartons: draft.cartons.map((current, i) =>
                              i === index
                                ? { ...current, partialDimensionsCm: dimensions }
                                : current,
                            ),
                          })
                        }
                      />
                    </div>
                  </section>
                ))}
          </div>
        );
      })}
      {draft.cartons.length >= 12 && (
        <p className="text-sm text-amber-800">
          This product supports up to 12 measured packages across its options.
        </p>
      )}
      {draft.units.some((unit) => !skus.includes(unit.variantSku)) && (
        <button
          type="button"
          className="w-fit text-sm text-red-700"
          onClick={() =>
            update({
              units: draft.units.filter((unit) => skus.includes(unit.variantSku)),
              cartons: draft.cartons.filter((carton) =>
                Object.keys(carton.capacityBySku ?? {}).some((key) => skus.includes(key)),
              ),
            })
          }
        >
          Remove shipping for deleted product options
        </button>
      )}
      <label className="flex! items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4! w-4!"
          checked={draft.verified && ready}
          disabled={!ready}
          onChange={(event) => onChange({ ...draft, verified: event.target.checked })}
        />
        I measured these sealed parcels
      </label>
      {!ready && (
        <p className="text-xs text-amber-800">
          Complete every parcel field to enable checkout quotes.
        </p>
      )}
    </section>
  );
}
