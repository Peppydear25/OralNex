import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About Our Dental & Medical Supply Store",
  description:
    "Learn how OralNex supplies dental and medical essentials, including nitrile examination gloves and surgical face masks.",
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
