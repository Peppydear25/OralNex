import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Shopping Cart",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <CartView />
      <SiteFooter />
    </>
  );
}
