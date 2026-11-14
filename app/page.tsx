import Link from "next/link";
import { HeroCarousel } from "./components/hero-carousel";
import { CategoryImage } from "./components/category-image";
import { HomeReveal } from "./components/home-reveal";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { collectionDestination } from "./data/collection-destination";
import { getPublicCatalog } from "./data/server-catalog";

export default async function Home() {
  const catalog = await getPublicCatalog();
  if (!catalog) return null;
  const { products, collections: managedCollections, merchandising } = catalog;
  return (
    <main className="homepage min-w-0 w-full overflow-x-clip">
      <HomeReveal />
      <SiteHeader />

      <section className="w-full overflow-hidden" aria-label="Featured medical equipment">
        <HeroCarousel
          slides={merchandising.heroSlides}
          eyebrow={merchandising.heroEyebrow}
          title={merchandising.heroTitle}
        />
      </section>

      <section
        data-home-reveal
        className="home-container my-12 sm:my-16"
        id="categories"
        aria-labelledby="categories-title"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8">
          <div>
            <h2
              className="text-[clamp(1.65rem,2.5vw,2.25rem)] font-semibold leading-tight tracking-tight text-[#172d36]"
              id="categories-title"
            >
              Shop by category
            </h2>
          </div>
          <Link
            className="group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#08788c] no-underline transition-colors hover:bg-[#edf6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08788c]"
            href="/shop"
          >
            Shop all supplies
            <span
              className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-2 md:gap-6">
          {managedCollections
            .filter((category) => collectionDestination(category, products))
            .map((category) => (
              <Link
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d8e8ea] bg-white text-ink no-underline transition-[border-color,box-shadow] duration-200 hover:border-[#0e96aa] hover:shadow-[0_12px_28px_rgba(8,120,140,.09)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
                href={collectionDestination(category, products)!}
                key={category.name}
              >
                <span className="relative block aspect-[4/3] max-h-[420px] overflow-hidden bg-[#edf4f5] sm:aspect-[16/10]">
                  <CategoryImage
                    key={category.image}
                    src={category.image}
                    sizes="(min-width: 1740px) 788px, (min-width: 768px) 46vw, 92vw"
                    animate
                  />
                </span>
                <div className="flex flex-1 flex-wrap items-center justify-between gap-4 border-t border-[#d8e8ea] px-5 py-5 sm:px-7 sm:py-6">
                  <div>
                    <h3 className="text-[clamp(1.25rem,1.6vw,1.5rem)] font-semibold leading-tight text-[#172d36]">
                      {category.name}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {category.name.toLowerCase() === "gloves"
                        ? "Nitrile examination gloves"
                        : category.name.toLowerCase() === "masks"
                          ? "Disposable face masks"
                          : "Explore the collection"}
                    </p>
                  </div>
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg bg-[#08788c] px-4 text-sm font-semibold text-white transition-colors group-hover:bg-[#066678] group-focus-visible:bg-[#066678]">
                    Shop {category.name.toLowerCase()}
                    <svg
                      className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </div>
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
