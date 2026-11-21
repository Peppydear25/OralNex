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
      <main className="grid min-h-[60vh] place-items-center bg-white px-4 py-14 text-[#172d36] sm:py-20">
        <section className="w-full max-w-md text-center">
          <p className="text-sm font-semibold tracking-widest text-[#08788c]">404</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Page not found</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            This page may have moved or no longer exists.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#08788c] px-6 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#066678]"
            href="/"
          >
            Back to home
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
