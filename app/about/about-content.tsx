import Link from "next/link";

const textLink =
  "font-semibold text-[#08788c] underline decoration-[#87c9d1] underline-offset-4 hover:text-[#066678]";

export function AboutContent() {
  return (
    <main className="min-w-0 bg-white px-4 pb-20 pt-12 text-[15px] leading-[1.85] text-[#172d36] sm:px-6 sm:pb-24 sm:pt-20">
      <div className="mx-auto max-w-[1050px]">
        <header className="max-w-[760px]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#08788c]">
            About OralNex
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
            A simpler way to shop gloves and face masks
          </h1>
          <p className="mt-6 text-slate-600">
            OralNex is an online store focused on nitrile examination gloves and disposable surgical
            face masks. We make product details, quantities, and ordering steps easier to understand
            for dental practices, clinics, workplaces, and everyday shoppers.
          </p>
        </header>

        <div className="mt-12 grid gap-10 border-t border-slate-200 pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 sm:mt-16 sm:pt-16">
          <section aria-labelledby="about-products">
            <h2 id="about-products" className="text-base font-semibold sm:text-lg">
              What we sell
            </h2>
            <p className="mt-4 text-slate-600">
              Our catalog centers on disposable gloves and face masks. Browse{" "}
              <Link href="/shop?category=gloves" className={textLink}>
                nitrile exam gloves
              </Link>{" "}
              for available sizes and colors, or explore{" "}
              <Link href="/shop?category=masks" className={textLink}>
                surgical face masks
              </Link>
              . Each product page shows its current options, specifications, and packaging details
              so you can choose what fits your needs.
            </p>
          </section>

          <section aria-labelledby="about-shopping">
            <h2 id="about-shopping" className="text-base font-semibold sm:text-lg">
              How shopping works
            </h2>
            <p className="mt-4 text-slate-600">
              Review the product information and available quantities before adding items to your
              cart. At checkout, you can review your order, delivery options, and total before
              payment. Available volume pricing is shown where it applies.
            </p>
            <p className="mt-4 text-slate-600">
              For processing times, delivery, and eligible returns, read our{" "}
              <Link href="/shipping-policy" className={textLink}>
                shipping and returns policy
              </Link>
              .
            </p>
          </section>
        </div>

        <section
          className="mt-12 rounded-2xl bg-[#eef7f8] px-6 py-8 sm:mt-16 sm:px-10 sm:py-10"
          aria-labelledby="about-approach"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#08788c]">
            Outlasting the middle man
          </p>
          <h2 id="about-approach" className="mt-3 text-base font-semibold sm:text-lg">
            Clear choices, from product page to checkout
          </h2>
          <p className="mt-4 max-w-[75ch] text-slate-600">
            Our motto reflects the experience we want to offer: fewer confusing steps between you
            and the supplies you need. We focus on useful product information, visible order
            quantities, and a checkout where you can see costs before placing an order.
          </p>
        </section>

        <section className="mt-12 max-w-[760px] sm:mt-16" aria-labelledby="about-support">
          <h2 id="about-support" className="text-base font-semibold sm:text-lg">
            Questions about a product or order?
          </h2>
          <p className="mt-4 text-slate-600">
            If you need help choosing gloves or masks, checking an order, or understanding delivery,{" "}
            <Link href="/contact" className={textLink}>
              contact the OralNex team
            </Link>
            . For an existing order, have your order number ready when you call.
          </p>
        </section>
      </div>
    </main>
  );
}
