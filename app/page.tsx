import Link from "next/link";
import { StaticHero } from "./components/static-hero";
import { CategoryImage } from "./components/category-image";
import { HomeReveal } from "./components/home-reveal";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { collectionDestination } from "./data/collection-destination";
import { getPublicCatalog } from "./data/server-catalog";

export default async function Home() {
  const catalog = await getPublicCatalog();
  if (!catalog) return null;
  const { products, collections: managedCollections } = catalog;
  return (
    <main className="homepage min-w-0 w-full overflow-x-clip">
      <HomeReveal />
      <SiteHeader />

      <section className="w-full overflow-hidden" aria-label="Featured medical equipment">
        <StaticHero />
      </section>

      <section
        data-home-reveal
        className="home-container my-12 sm:my-16"
        id="categories"
        aria-labelledby="categories-title"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:mb-8">
          <div>
            <span className="mb-4 block h-1 w-14 rounded-full bg-[#08788c]" aria-hidden="true" />
            <h2
              className="text-3xl font-semibold leading-tight text-[#172d36] sm:text-4xl"
              id="categories-title"
            >
              Shop by category
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Browse our essential medical supplies
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#08788c] no-underline hover:text-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
            href="/shop"
          >
            View all categories <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {managedCollections
            .filter((category) => collectionDestination(category, products))
            .map((category) => (
              <Link
                className="home-category-card group relative isolate grid min-h-[260px] min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] overflow-hidden rounded-3xl border border-[#c9e5e8] text-[#172d36] no-underline transition-colors hover:border-[#08788c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c] sm:min-h-[400px]"
                href={collectionDestination(category, products)!}
                key={category.slug}
              >
                <div className="relative z-10 flex min-w-0 flex-col items-start justify-center gap-7 p-5 sm:gap-9 sm:p-8">
                  <h3 className="w-full break-words text-xl font-semibold leading-tight sm:text-2xl">
                    {category.name}
                  </h3>
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-[#08788c] text-white transition-colors group-hover:bg-[#066678] group-focus-visible:bg-[#066678]"
                    aria-hidden="true"
                  >
                    <svg
                      className="size-6 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </div>
                <span className="relative z-10 block min-h-full min-w-0 overflow-hidden">
                  <CategoryImage
                    key={category.image}
                    src={category.image}
                    sizes="(min-width: 1740px) 440px, (min-width: 768px) 26vw, 55vw"
                    animate
                  />
                </span>
              </Link>
            ))}
        </div>
      </section>

      <section
        data-home-reveal
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

      <section
        data-home-reveal
        className="home-container mb-14 sm:mb-20"
        aria-labelledby="why-oral-nex-title"
      >
        <div className="mb-8 max-w-2xl sm:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#08788c]">
            The OralNex way
          </p>
          <h2 id="why-oral-nex-title" className="section-heading">
            Essentials, without the extra steps.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3 md:gap-10 lg:gap-16">
          <article className="grid grid-cols-[auto_1fr] content-start gap-x-4 md:block">
            <span
              className="row-span-2 grid size-12 place-items-center rounded-full bg-[#edf7f8] text-[#08788c] md:mb-5"
              aria-hidden="true"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
            <h3 className="text-lg font-semibold leading-6">A more direct approach</h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-slate-600">
              We make it easier to find the essentials you need, without unnecessary steps.
            </p>
          </article>
          <article className="grid grid-cols-[auto_1fr] content-start gap-x-4 md:block">
            <span
              className="row-span-2 grid size-12 place-items-center rounded-full bg-[#edf7f8] text-[#08788c] md:mb-5"
              aria-hidden="true"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16M4 12h10M4 18h16" />
                <path d="m16 12 2 2 3-4" />
              </svg>
            </span>
            <h3 className="text-lg font-semibold leading-6">Clarity from the start</h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-slate-600">
              Know your options and delivery costs before you place an order.
            </p>
          </article>
          <article className="grid grid-cols-[auto_1fr] content-start gap-x-4 md:block">
            <span
              className="row-span-2 grid size-12 place-items-center rounded-full bg-[#edf7f8] text-[#08788c] md:mb-5"
              aria-hidden="true"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 5h16v12H8l-4 3V5Z" />
                <path d="M8 9h8M8 13h5" />
              </svg>
            </span>
            <h3 className="text-lg font-semibold leading-6">People you can reach</h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-slate-600">
              Have a question? Our team is here to help with products, orders, and delivery.
            </p>
          </article>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
