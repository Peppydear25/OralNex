import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About OralNex | Nitrile Gloves & Surgical Face Masks",
  description:
    "Learn about OralNex, an online store for nitrile examination gloves and disposable surgical face masks. Explore our products, ordering details, and customer support.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <AboutContent />
      <SiteFooter />
    </>
  );
}
