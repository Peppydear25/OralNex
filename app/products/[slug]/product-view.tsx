import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import type { Product } from "../../data/catalog";
import { ProductGallery } from "./product-gallery";
import { ProductInformation } from "./product-information";
import { PurchasePanel } from "./purchase-panel";

export function ProductView({ product }: { product: Product }) {
  return (
    <>
      <SiteHeader />
      <main className="min-w-0 overflow-x-clip bg-white pb-20 text-[#253138]">
        <div className="mx-auto w-[calc(100%-3rem)] max-w-[1280px] pt-7 text-sm text-slate-500 max-sm:w-[calc(100%-1.75rem)] max-sm:pt-5">
          <Link className="no-underline transition hover:text-[#08788c]" href="/shop">
            Shop supplies
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-slate-700">{product.name}</span>
        </div>
        <section className="mx-auto mt-6 grid min-w-0 w-[calc(100%-3rem)] max-w-[1280px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-10 max-xl:gap-8 max-lg:grid-cols-1 max-lg:gap-8 max-sm:mt-5 max-sm:w-[calc(100%-1.75rem)]">
          <ProductGallery
            name={product.name}
            images={product.images?.length ? product.images : [product.image]}
            onSale={Boolean(product.oldPrice && product.oldPrice > product.price)}
          />
          <div className="min-w-0 [overflow-wrap:anywhere] [&_h1]:text-[clamp(29px,3vw,40px)] [&_h1]:font-semibold [&_h1]:leading-[1.16] [&_h1]:tracking-[-.035em]">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#08788c]">
              {product.category}
            </p>
            <h1>{product.name}</h1>
            <div className="mt-7 max-sm:mt-6">
              <PurchasePanel product={product} />
            </div>
          </div>
        </section>
        <ProductInformation product={product} />
      </main>
      <SiteFooter />
    </>
  );
}
