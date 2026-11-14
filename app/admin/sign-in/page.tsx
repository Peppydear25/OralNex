import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { hasAdminSession } from "../auth";
import { AdminSignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};
export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (await hasAdminSession()) redirect("/admin");
  const { status } = await searchParams;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4f8f9] p-5 text-slate-800 before:absolute before:-right-40 before:-top-40 before:size-[480px] before:rounded-full before:bg-cyan-100/60 before:blur-3xl after:absolute after:-bottom-48 after:-left-48 after:size-[440px] after:rounded-full after:bg-[#0e96aa]/10 after:blur-3xl">
      <section className="relative z-10 w-full min-w-0 max-w-[440px] rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(9,47,56,.1)] max-sm:p-6">
        <div className="flex items-center border-b border-slate-200 pb-5 [&_img]:rounded-lg">
          <Image
            src="/logo.jpg"
            alt="OralNex"
            width={68}
            height={68}
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="my-6">
          <h1 className="text-2xl font-semibold tracking-tight">Admin access</h1>
        </div>
        <AdminSignInForm signedOut={status === "signed-out"} />
        {/* The root layout caches its provider tree; leaving this standalone route must reload it. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          className="mt-6 block text-center text-sm font-semibold text-slate-500 transition hover:text-[#08788c]"
          href="/"
        >
          ← Return to storefront
        </a>
      </section>
    </main>
  );
}
