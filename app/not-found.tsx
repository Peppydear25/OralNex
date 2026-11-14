import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested OralNex page could not be found.",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="relative isolate grid min-h-[68vh] place-items-center overflow-hidden bg-[#f5f9fa] px-6 py-20 text-[#253138] max-sm:px-4 max-sm:py-14">
        <div
          className="absolute left-1/2 top-1/2 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0a8d99]/8 blur-3xl max-sm:size-80"
          aria-hidden="true"
        />
        <section className="mx-auto grid w-full max-w-2xl justify-items-center text-center">
          <div className="relative grid size-24 place-items-center rounded-3xl border border-[#0a8d99]/20 bg-white shadow-[0_18px_50px_rgba(15,55,65,.1)] max-sm:size-20">
            <svg
              className="size-12 text-[#0a8d99] max-sm:size-10"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M24 7 41 37H7L24 7Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M24 18v9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="32" r="1.6" fill="currentColor" />
            </svg>
          </div>

          <p className="mt-8 text-sm font-bold uppercase tracking-[.22em] text-[#08788c]">
            Error 404
          </p>
          <h1 className="mt-3 text-[clamp(2.5rem,7vw,4.75rem)] font-semibold leading-[1.04] tracking-[-.04em]">
            This page is unavailable.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 max-sm:text-sm max-sm:leading-6">
            The address may be incorrect, or the page may have moved. Return home or continue to the
            equipment catalog.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-col">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0a8d99] px-7 font-bold text-white shadow-lg shadow-[#0a8d99]/15 transition hover:-translate-y-0.5 hover:bg-[#087b86]"
              href="/"
            >
              Return home
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-7 font-bold text-[#253138] transition hover:-translate-y-0.5 hover:border-[#0a8d99] hover:text-[#08788c]"
              href="/shop"
            >
              Shop equipment
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
