import type { Metadata } from "next";
import Link from "next/link";
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
      <main className="bg-[#f7f9f9] px-4 py-14 text-[#172d36] sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
            <header className="lg:pt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#08788c]">
                OralNex support
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Contact us</h1>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
                Questions about gloves, face masks, an order, or delivery? Speak with our team and
                we’ll help you find the next step.
              </p>
              <p className="mt-7 max-w-md border-l-2 border-[#08788c] pl-4 text-sm leading-6 text-slate-600">
                For an existing order, please have your order number ready when you call.
              </p>
            </header>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(23,45,54,0.06)]">
              <section className="p-6 sm:p-9" aria-labelledby="contact-phone-title">
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf5f6] text-[#08788c]">
                    <svg
                      className="size-5"
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
                  </span>
                  <div>
                    <h2 id="contact-phone-title" className="text-lg font-semibold">
                      Call our team
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Product questions, orders, and delivery support.
                    </p>
                  </div>
                </div>
                <a
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#08788c] px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c] sm:w-auto"
                  href={`tel:${BUSINESS_CONTACT.phone}`}
                >
                  {BUSINESS_CONTACT.phoneDisplay}
                </a>
              </section>

              <section
                className="border-t border-slate-200 p-6 sm:p-9"
                aria-labelledby="contact-address-title"
              >
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf5f6] text-[#08788c]">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </span>
                  <div>
                    <h2 id="contact-address-title" className="text-lg font-semibold">
                      Business address
                    </h2>
                    <address className="mt-2 text-sm leading-6 not-italic text-slate-600">
                      {BUSINESS_ADDRESS.street}
                      <br />
                      {BUSINESS_ADDRESS.cityStatePostal}
                    </address>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600 lg:mt-16">
            Looking for delivery or return details?{" "}
            <Link
              href="/shipping-policy"
              className="font-semibold text-[#08788c] underline underline-offset-4 hover:text-[#066678]"
            >
              View shipping &amp; returns
            </Link>
            .
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
