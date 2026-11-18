import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { AccountAccessShell } from "./account-access-shell";
import { AuthPanel } from "./auth-panel";
import { redirectAdminFromBuyerAccount } from "./auth";
import { safeBuyerPath } from "../lib/navigation";

export const metadata: Metadata = {
  title: "Your Account",
  description:
    "Sign in or create an OralNex account to track medical-equipment orders, manage addresses, and view purchase history.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; authError?: string }>;
}) {
  const { returnTo, authError } = await searchParams;
  const role = await redirectAdminFromBuyerAccount();
  if (role === "buyer") {
    const destination = safeBuyerPath(returnTo);
    redirect(
      new URL(destination, "https://local.invalid").pathname === "/account"
        ? "/account/dashboard"
        : destination,
    );
  }

  return (
    <>
      <SiteHeader />
      <AccountAccessShell>
        <AuthPanel returnTo={returnTo} initialError={authError} />
      </AccountAccessShell>
      <SiteFooter />
    </>
  );
}
