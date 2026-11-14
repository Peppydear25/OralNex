import type { Metadata } from "next";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { AccountAccessShell } from "../account-access-shell";
import { ForgotPasswordPanel } from "./forgot-password-panel";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description: "Request password-reset instructions for your OralNex buyer account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AccountAccessShell>
        <ForgotPasswordPanel />
      </AccountAccessShell>
      <SiteFooter />
    </>
  );
}
