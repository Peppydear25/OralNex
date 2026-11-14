import type { ProductVariant } from "../../data/catalog";

export function VariantInventoryFields({
  variants,
  onChange,
  error,
}: {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  error?: string;
}) {
  if (!variants.length) return null;

  const update = (index: number, field: "sku" | "inventory", value: string | number) =>
    onChange(
      variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
  const total = variants.reduce((sum, variant) => sum + variant.inventory, 0);

  return (
    <section className="col-span-2 grid gap-3 max-sm:col-span-1">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-semibold">Variant inventory</h3>
          <p className="mt-1 text-xs text-slate-500">
            Track stock independently for every sellable option combination.
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-500">
          Total stock
          <strong className="block text-lg text-slate-900">{total}</strong>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 max-sm:hidden">
          <span>Variant</span>
          <span>SKU</span>
          <span>Available</span>
        </div>
        <div className="divide-y divide-slate-200">
          {variants.map((variant, index) => (
            <div
              className="grid grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_110px] items-center gap-3 p-4 max-sm:grid-cols-1"
              key={variant.id}
            >
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(variant.options).map(([name, value]) => (
                  <span
                    className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-[#08788c]"
                    key={name}
                  >
                    {name}: {value}
                  </span>
                ))}
              </div>
              <label className="max-sm:grid max-sm:gap-1">
                <span className="hidden text-xs font-semibold text-slate-500 max-sm:block">
                  SKU
                </span>
                <input
                  value={variant.sku ?? ""}
                  onChange={(event) => update(index, "sku", event.target.value.toUpperCase())}
                  maxLength={40}
                  aria-label={`SKU for ${Object.values(variant.options).join(" / ")}`}
                />
              </label>
              <label className="max-sm:grid max-sm:gap-1">
                <span className="hidden text-xs font-semibold text-slate-500 max-sm:block">
                  Available stock
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variant.inventory ?? 0}
                  onChange={(event) =>
                    update(index, "inventory", Math.max(0, Number(event.target.value) || 0))
                  }
                  aria-label={`Stock for ${Object.values(variant.options).join(" / ")}`}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      {variants.length === 100 && (
        <p className="text-xs font-semibold text-amber-700">
          The first 100 variants are shown. Reduce option values before saving the product.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
