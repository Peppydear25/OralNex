import type { Metadata } from "next";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { AccountAccessShell } from "../account-access-shell";
import { ResetPasswordPanel } from "./reset-password-panel";

export const metadata: Metadata = {
  title: "Choose a New Password",
  description: "Choose a new password for your OralNex buyer account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AccountAccessShell>
        <ResetPasswordPanel />
      </AccountAccessShell>
      <SiteFooter />
    </>
  );
}
