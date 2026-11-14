import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { ContactForm } from "./contact-form";
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
      <main className="mx-auto w-[calc(100%-2rem)] max-w-[680px] py-10 text-[#172d36] sm:py-14">
        <header className="mb-7 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm text-slate-600">
            We’re here to help with your order or products.
          </p>
        </header>

        <section
          aria-label="Contact form"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8"
        >
          <ContactForm />
        </section>

        <div className="mt-6 text-center text-sm leading-6 text-slate-600">
          <p>
            Call us at{" "}
            <a
              className="font-semibold text-[#08788c] underline underline-offset-2"
              href={`tel:${BUSINESS_CONTACT.phone}`}
            >
              {BUSINESS_CONTACT.phoneDisplay}
            </a>
          </p>
          <address className="mt-1 not-italic">{BUSINESS_ADDRESS.full}</address>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
