export type Specification = {
  label: string;
  value: string;
};

export function SpecificationFields({
  specifications,
  onChange,
}: {
  specifications: Specification[];
  onChange: (value: Specification[]) => void;
}) {
  const updateSpecification = (index: number, field: keyof Specification, value: string) => {
    onChange(
      specifications.map((specification, itemIndex) =>
        itemIndex === index ? { ...specification, [field]: value } : specification,
      ),
    );
  };

  return (
    <div className="col-span-2 grid gap-2 text-sm font-semibold max-sm:col-span-1">
      <span>Specifications</span>
      <div className="grid min-w-0 gap-2 max-sm:[&>div]:grid-cols-[minmax(0,1fr)_44px] [&>div]:grid [&>div]:min-w-0 [&>div]:grid-cols-[minmax(0,.65fr)_minmax(0,1.35fr)_44px] [&>div]:gap-2 [&_input]:min-w-0 max-sm:[&_input:nth-child(2)]:col-start-1 [&_button]:size-11 [&_button]:shrink-0 [&_button]:rounded-lg [&_button]:border [&_button]:border-red-200 [&_button]:text-red-600 max-sm:[&_button]:row-span-2 max-sm:[&_button]:row-start-1">
        {specifications.map((specification, index) => (
          <div key={index}>
            <input
              value={specification.label}
              onChange={(event) => updateSpecification(index, "label", event.target.value)}
              placeholder="Label"
            />
            <input
              value={specification.value}
              onChange={(event) => updateSpecification(index, "value", event.target.value)}
              placeholder="Value"
            />
            <button
              type="button"
              onClick={() => onChange(specifications.filter((_, itemIndex) => itemIndex !== index))}
              disabled={specifications.length === 1}
              aria-label={`Delete specification ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="w-fit rounded-md border border-cyan-200 px-3 py-2 text-xs font-bold text-[#08788c]"
        type="button"
        onClick={() => onChange([...specifications, { label: "", value: "" }])}
      >
        ＋ Add specification
      </button>
    </div>
  );
}

export function BulkPricingFields({
  tiers,
  onChange,
  error,
}: {
  tiers: BulkPricingTier[];
  onChange: (value: BulkPricingTier[]) => void;
  error?: string;
}) {
  const updateTier = (index: number, field: keyof BulkPricingTier, value: number) => {
    onChange(
      tiers.map((tier, itemIndex) => (itemIndex === index ? { ...tier, [field]: value } : tier)),
    );
  };

  return (
    <div className="col-span-2 grid gap-2 text-sm font-semibold max-sm:col-span-1">
      <div className="grid gap-3 max-sm:[&>div]:grid-cols-[minmax(0,1fr)_44px] [&>div]:grid [&>div]:grid-cols-[1fr_1fr_44px] [&>div]:gap-2 [&>div]:rounded-xl [&>div]:border [&>div]:border-slate-200 [&>div]:bg-slate-50 [&>div]:p-3 [&_input]:min-w-0 max-sm:[&_label:nth-child(2)]:col-start-1 [&_button]:size-11 [&_button]:rounded-lg [&_button]:border [&_button]:border-red-200 [&_button]:text-red-600 max-sm:[&_button]:row-span-2 max-sm:[&_button]:row-start-1">
        {tiers.map((tier, index) => (
          <div key={index}>
            <label>
              Minimum quantity
              <input
                type="number"
                min="2"
                max="999"
                value={tier.minQuantity}
                onChange={(event) => updateTier(index, "minQuantity", Number(event.target.value))}
              />
            </label>
            <label>
              Percentage off
              <input
                type="number"
                min="1"
                max="99"
                value={tier.discountPercent}
                onChange={(event) =>
                  updateTier(index, "discountPercent", Number(event.target.value))
                }
              />
            </label>
            <button
              className="self-end"
              type="button"
              onClick={() => onChange(tiers.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Delete bulk pricing tier ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="w-fit rounded-md border border-cyan-200 px-3 py-2 text-xs font-bold text-[#08788c]"
        type="button"
        onClick={() => {
          const largestQuantity = Math.max(0, ...tiers.map((tier) => tier.minQuantity));
          const largestDiscount = Math.max(0, ...tiers.map((tier) => tier.discountPercent));
          onChange([
            ...tiers,
            {
              minQuantity: Math.min(999, Math.max(10, largestQuantity + 10)),
              discountPercent: Math.min(99, largestDiscount + 5),
            },
          ]);
        }}
        disabled={
          tiers.length >= 6 ||
          tiers.some((tier) => tier.minQuantity >= 999 || tier.discountPercent >= 99)
        }
      >
        ＋ Add volume discount
      </button>
      {error && (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
import type { BulkPricingTier } from "../../data/catalog";
import type { ProductOption } from "../../data/catalog";

export function ProductOptionFields({
  options,
  onChange,
}: {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
}) {
  const update = (index: number, value: Partial<ProductOption>) =>
    onChange(
      options.map((option, itemIndex) => (itemIndex === index ? { ...option, ...value } : option)),
    );
  return (
    <div className="col-span-2 grid gap-3 text-sm font-semibold max-sm:col-span-1">
      <div className="grid gap-3">
        {options.map((option, index) => (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={index}>
            <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
              <label>
                Option name
                <input
                  value={option.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                  placeholder="e.g. Size"
                  maxLength={40}
                />
              </label>
              <button
                className="mt-auto size-11 rounded-lg border border-red-200 text-red-600"
                type="button"
                onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Delete option ${index + 1}`}
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {option.values.map((value, valueIndex) => (
                <span
                  className="inline-flex items-center overflow-hidden rounded-full border border-slate-300 bg-white"
                  key={valueIndex}
                >
                  <input
                    className="h-9! w-28! border-0! px-3! text-xs"
                    value={value}
                    onChange={(event) =>
                      update(index, {
                        values: option.values.map((item, itemIndex) =>
                          itemIndex === valueIndex ? event.target.value : item,
                        ),
                      })
                    }
                    aria-label={`${option.name || "Option"} value ${valueIndex + 1}`}
                  />
                  <button
                    className="h-9 px-2 text-red-500"
                    type="button"
                    onClick={() =>
                      update(index, {
                        values: option.values.filter((_, itemIndex) => itemIndex !== valueIndex),
                      })
                    }
                    aria-label={`Delete ${value}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-bold text-[#08788c]"
                type="button"
                onClick={() => update(index, { values: [...option.values, ""] })}
              >
                ＋ Add value
              </button>
            </div>
          </section>
        ))}
      </div>
      <button
        className="w-fit rounded-lg border border-cyan-200 px-4 py-2.5 text-xs font-bold text-[#08788c]"
        type="button"
        onClick={() => onChange([...options, { name: "", values: [""] }])}
        disabled={options.length >= 10}
      >
        ＋ Add product option
      </button>
    </div>
  );
}
