import type { Metadata } from "next";
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
    <main className="grid min-h-screen place-items-center bg-white p-5 text-slate-800">
      <section className="w-full min-w-0 max-w-[440px] p-8 max-sm:p-6">
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
