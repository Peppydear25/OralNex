import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { BUSINESS_ADDRESS, BUSINESS_CONTACT } from "../../lib/business";

export const metadata: Metadata = {
  title: "Contact Our Dental & Medical Supply Team",
  description:
    "Contact OralNex in San Angelo, Texas about nitrile gloves, face masks, product availability, orders, delivery, or returns.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-[calc(100%-2rem)] max-w-[1040px] py-12 text-[#172d36] sm:w-[calc(100%-3rem)] sm:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
          <header>
            <span className="mb-5 block h-1 w-10 bg-[#08788c]" aria-hidden="true" />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              We’re here to help with products, orders, and delivery.
            </p>
          </header>

          <div>
            <section aria-labelledby="contact-phone-title">
              <h2 id="contact-phone-title" className="text-lg font-semibold">
                Call our team
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                For order questions, have your order number ready.
              </p>
              <a
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#08788c] px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c] sm:w-auto"
                href={`tel:${BUSINESS_CONTACT.phone}`}
              >
                <svg
                  className="size-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.6 9.5a16 16 0 0 0 6.9 6.9l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 2Z" />
                </svg>
                Call {BUSINESS_CONTACT.phoneDisplay}
              </a>
            </section>

            <section
              className="mt-8 border-t border-slate-200 pt-7"
              aria-labelledby="contact-address-title"
            >
              <h2 id="contact-address-title" className="text-sm font-semibold">
                Business address
              </h2>
              <address className="mt-2 text-sm leading-6 not-italic text-slate-600">
                {BUSINESS_ADDRESS.street}
                <br />
                {BUSINESS_ADDRESS.cityStatePostal}
              </address>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
