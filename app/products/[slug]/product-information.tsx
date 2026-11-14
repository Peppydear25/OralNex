import type { Product } from "../../data/catalog";

export function ProductInformation({ product }: { product: Product }) {
  const optionLabels = new Set([
    "size",
    "sizes",
    "available size",
    "available sizes",
    "color",
    "colors",
    "available color",
    "available colors",
    "product type",
  ]);
  const specifications = product.specifications.filter(
    (specification) => !optionLabels.has(specification.label.trim().toLowerCase()),
  );

  return (
    <section
      className="relative mx-auto mt-16 min-w-0 w-[calc(100%-3rem)] max-w-[1280px] max-sm:mt-12 max-sm:w-[calc(100%-1.75rem)]"
      aria-labelledby="product-info-title"
    >
      <div className="grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-2 lg:gap-14 sm:pt-10">
        <div>
          <div className="border-b border-slate-200 pb-3">
            <h2
              className="text-2xl font-semibold leading-tight tracking-[-.02em] text-[#172d36]"
              id="product-info-title"
            >
              Product details
            </h2>
          </div>
          <p className="mt-5 max-w-[60ch] text-[15px] leading-7 text-slate-600 [overflow-wrap:anywhere]">
            {product.description}
          </p>
        </div>
        {specifications.length > 0 && (
          <div>
            <h3 className="border-b border-slate-200 pb-3 text-2xl font-semibold tracking-[-.02em] text-[#172d36]">
              Specifications
            </h3>
            <dl className="mt-5 max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white">
              {specifications.map((spec, index) => (
                <div
                  className="grid min-w-0 grid-cols-[minmax(130px,.7fr)_minmax(0,1.3fr)] border-b border-slate-200 last:border-b-0 even:bg-slate-50 max-sm:grid-cols-[110px_minmax(0,1fr)]"
                  key={`${spec.label}-${index}`}
                >
                  <dt className="border-r border-slate-200 px-5 py-3.5 text-sm font-medium text-slate-500 max-sm:px-3">
                    {spec.label}
                  </dt>
                  <dd className="min-w-0 px-5 py-3.5 text-sm font-medium text-slate-700 [overflow-wrap:anywhere] max-sm:px-3">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
