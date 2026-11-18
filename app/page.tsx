import Link from "next/link";
import { StaticHero } from "./components/static-hero";
import { CategoryCards } from "./components/category-cards";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { getPublicCatalog } from "./data/server-catalog";

export default async function Home() {
  const catalog = await getPublicCatalog();
  if (!catalog) return null;
  const { products, collections: managedCollections } = catalog;
  return (
    <main className="homepage min-w-0 w-full overflow-x-clip">
      <SiteHeader />

      <section className="w-full overflow-hidden" aria-label="Featured medical equipment">
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
        <CategoryCards collections={managedCollections} products={products} />
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
            Outlasting the <span className="text-[#08788c]">Middleman.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            A more direct way to get dental and medical essentials, with clear choices and fewer
            obstacles.
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
