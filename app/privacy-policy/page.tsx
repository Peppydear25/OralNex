import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { PrivacyPolicyContent } from "./privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how OralNex collects, uses, discloses, retains, and protects personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  const companyName = "Oral Nex";

  return (
    <>
      <SiteHeader />
      <PrivacyPolicyContent companyName={companyName} />
      <SiteFooter />
    </>
  );
}
