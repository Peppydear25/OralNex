import type { Metadata } from "next";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { BuyerDashboard } from "./buyer-dashboard";
import { requireBuyer } from "../auth";

export const metadata: Metadata = {
  title: "My Account",
  description: "Review OralNex orders, delivery tracking, addresses, and customer account details.",
  robots: { index: false, follow: false },
};

export default async function BuyerAccountPage() {
  await requireBuyer();
  return (
    <>
      <SiteHeader />
      <div className="min-h-[70vh] bg-white">
        <BuyerDashboard />
      </div>
      <SiteFooter />
    </>
  );
}
