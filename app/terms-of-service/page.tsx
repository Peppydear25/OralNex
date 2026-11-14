import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { TermsContent } from "./terms-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the terms governing use of the OralNex dental and medical supply storefront and purchases.",
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsOfServicePage() {
  const companyName = "Oral Nex";

  return (
    <>
      <SiteHeader />
      <TermsContent companyName={companyName} />
      <SiteFooter />
    </>
  );
}
