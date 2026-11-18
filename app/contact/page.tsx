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
      <main className="mx-auto w-[calc(100%-2rem)] max-w-[960px] pb-8 pt-14 text-[#172d36] sm:pb-10 sm:pt-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#08788c]">
            Here to help
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-5 text-[14.5px] leading-6 text-slate-600">
            Questions about our products, an order, or delivery? Our team is here to help.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-xl sm:mt-12">
          <section className="flex flex-col items-center text-center">
            <span
              className="grid size-14 place-items-center rounded-full bg-[#edf7f8] text-[#08788c]"
              aria-hidden="true"
            >
              <svg
                className="size-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.6 9.5a16 16 0 0 0 6.9 6.9l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 2Z" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold">Call us</h2>
            <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-600">
              Whether you need help choosing a product, checking an order, or asking about delivery,
              our team is ready to assist. Give us a call and we’ll be happy to help.
            </p>
            <a
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#08788c] px-6 text-sm font-semibold text-white no-underline shadow-sm transition-colors hover:bg-[#066678] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08788c]"
              href={`tel:${BUSINESS_CONTACT.phone}`}
            >
              Call {BUSINESS_CONTACT.phoneDisplay}
            </a>
          </section>
        </div>
        <address className="mt-8 flex items-center justify-center gap-2 text-[13px] font-bold leading-6 not-italic text-slate-700">
          <svg
            className="size-4 shrink-0 text-[#08788c]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>{BUSINESS_ADDRESS.full}</span>
        </address>
      </main>
      <SiteFooter />
    </>
  );
}
