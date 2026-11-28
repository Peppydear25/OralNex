import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { StaticHero } from "./components/static-hero";
import { CategoryCards } from "./components/category-cards";
import { HomeBenefits } from "./components/home-benefits";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { getPublicCatalog } from "./data/server-catalog";

export const metadata: Metadata = {
  title: "Nitrile Exam Gloves & Surgical Face Masks",
  description:
    "Shop nitrile examination gloves and disposable surgical face masks for dental practices, clinics, and everyday care at OralNex.",
  alternates: { canonical: "/" },
};

async function HomeCategories() {
  const catalog = await getPublicCatalog();
  if (!catalog) {
    return <p className="text-sm text-slate-600">Categories are temporarily unavailable.</p>;
  }
  return <CategoryCards collections={catalog.collections} products={catalog.products} />;
}

export default function Home() {
  return (
    <main className="homepage min-w-0 w-full overflow-x-clip">
      <SiteHeader />

      <section className="w-full overflow-hidden" aria-label="Shop nitrile gloves and face masks">
        <StaticHero />
      </section>

      <section
        className="home-container my-12 sm:my-16"
        id="categories"
        aria-labelledby="categories-title"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:mb-8 sm:items-end">
          <div>
            <span className="mb-4 block h-1 w-14 rounded-full bg-[#08788c]" aria-hidden="true" />
            <h2
              className="text-3xl font-semibold leading-tight text-[#172d36] sm:text-4xl"
              id="categories-title"
            >
              Shop by category
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#08788c] no-underline hover:text-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
            href="/shop"
          >
            View all categories <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-600">Loading categories…</p>}>
          <HomeCategories />
        </Suspense>
      </section>

      <HomeBenefits />

      <section
        className="home-container my-12 grid items-center gap-7 sm:my-16 lg:grid-cols-2 lg:gap-12"
        aria-labelledby="featured-gloves-title"
      >
        <div className="overflow-hidden rounded-2xl bg-[#eaf5f6]">
          <Image
            src="/Glove1.jpg"
            alt="OralNex nitrile exam gloves packaging artwork"
            width={1600}
            height={666}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[16/9] w-full object-cover object-center"
          />
        </div>
        <div className="max-w-[540px]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#08788c]">
            OralNex
          </p>
          <h2
            id="featured-gloves-title"
            className="mt-2 text-2xl font-semibold leading-tight text-[#172d36] sm:text-3xl"
          >
            Nitrile Exam Gloves
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Black OralNex nitrile exam gloves are single-use, powder-free, non-sterile, and
            latex-free, offering an ambidextrous fit with reliable sensitivity and protection for
            routine exams and general care.
          </p>
        </div>
      </section>

      <section
        className="home-about home-container my-14 py-12 sm:my-20 sm:py-16"
        aria-labelledby="about-oral-nex-title"
      >
        <div className="mx-auto max-w-[760px] text-center">
          <span
            className="home-about-accent mx-auto mb-5 block h-0.5 w-12 rounded-full bg-[#0e96aa]"
            aria-hidden="true"
          />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#08788c]">
            Our story
          </p>
          <h2
            id="about-oral-nex-title"
            className="text-[clamp(1.875rem,3.2vw,3rem)] font-semibold leading-[1.15] tracking-tight text-[#172d36]"
          >
            Outlasting the <span className="text-[#08788c]">middle man.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            OralNex makes it straightforward to shop nitrile exam gloves and disposable surgical
            face masks for dental practices, clinics, and everyday care. Compare product details and
            box quantities before you order.
          </p>
          <Link
            href="/about"
            className="group mt-7 inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#08788c] px-6 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
          >
            About OralNex{" "}
            <span
              className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
