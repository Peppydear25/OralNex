import Link from "next/link";

export function AboutContent() {
  return (
    <main className="min-w-0 overflow-x-clip bg-white px-5 pb-20 pt-14 text-[#35434b] max-sm:px-4 max-sm:pb-14 max-sm:pt-10 sm:pt-20">
      <div className="mx-auto min-w-0 max-w-[1050px]">
        <header className="mb-12 text-center max-sm:mb-9">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-[#253138]">
            About OralNex
          </h1>
          <p className="mt-4 text-sm font-medium tracking-[.08em] text-[#08788c]">
            Outlasting the Middleman
          </p>
        </header>

        <article className="min-w-0 text-[15px] leading-[1.85] text-slate-600 [overflow-wrap:anywhere] [&>section]:mt-10 [&>section:first-of-type]:mt-0 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[.06em] [&_h2]:leading-snug [&_h2]:text-[#253138] max-sm:[&_h2]:text-base">
          <section aria-labelledby="about-overview">
            <h2 id="about-overview">Overview</h2>
            <p>
              OralNex brings everyday dental and medical supplies into one straightforward place to
              shop. We offer nitrile examination gloves and disposable surgical face masks for
              practices, workplaces, and individuals who need to keep essential supplies close at
              hand. Our focus is on making it easier to see what you are buying, choose the right
              option, and place an order with confidence.
            </p>
          </section>

          <section aria-labelledby="about-motto">
            <h2 id="about-motto">Outlasting the Middleman</h2>
            <p>
              Our motto speaks to the kind of shopping experience we want to build: one with less
              unnecessary friction between the customer and the supplies they need. Rather than
              making you work through unclear listings or confusing order quantities, we aim to
              present useful product details and pricing plainly. You can review your choices and
              the delivery charge before completing your purchase.
            </p>
            <p className="mt-4">
              For us, this is about earning trust through clarity and consistency. Whether you are
              ordering one box or restocking for a busy team, the process should feel manageable
              from product selection through checkout.
            </p>
          </section>

          <section aria-labelledby="about-products">
            <h2 id="about-products">Care in the details</h2>
            <p>
              Choosing supplies for a practice, workplace, or everyday care should start with
              reliable information. Our catalog focuses on gloves and masks, with available options,
              product specifications, and pieces per box shown on each product page. That helps you
              check what fits your needs before you buy.
            </p>
          </section>

          <section aria-labelledby="about-service">
            <h2 id="about-service">Here for our customers</h2>
            <p>
              Good service means making the next step clear. You can see box quantities and volume
              prices before adding an item to your cart, then review delivery options and the full
              amount before payment. If something about a product, order, or delivery needs
              attention, you can reach our team by phone.
            </p>
            <p className="mt-4">
              Have a question?{" "}
              <Link
                href="/contact"
                className="font-medium text-[#08788c] underline underline-offset-2"
              >
                Contact us
              </Link>{" "}
              and we’ll be glad to help.
            </p>
          </section>

          <section aria-labelledby="about-improvement">
            <h2 id="about-improvement">Always improving</h2>
            <p>
              We keep refining how customers find product details, choose the right quantity, and
              complete an order. Questions and feedback help us spot what could be clearer. Our goal
              is a shopping experience that stays straightforward as customer needs change.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
