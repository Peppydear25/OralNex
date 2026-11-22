import type { Metadata } from "next";
import Link from "next/link";
import { PolicyDocumentLayout } from "../components/policy-document-layout";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getReturnWindowDays } from "../../lib/returns";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Read processing, delivery, return, and refund information for OralNex dental and medical supply orders.",
  alternates: { canonical: "/shipping-policy" },
};
export default function ShippingPolicyPage() {
  const returnWindow = getReturnWindowDays();
  return (
    <>
      <SiteHeader />
      <PolicyDocumentLayout
        title="Shipping & Returns"
        updatedDate="November 22, 2026"
        description="Shipping, returns, and refunds for OralNex gloves, masks, and medical supplies."
      >
        <section className="scroll-mt-8" id="delivery">
          <h2>Shipping</h2>
          <p>
            OralNex processes paid orders within <strong>1–2 working days</strong> after payment and
            address confirmation. Working days are Monday–Friday, excluding federal holidays.
            Carrier transit time is additional.
          </p>
          <p className="mt-4">
            Shipping options and costs appear at checkout. Delivery dates are estimates; bulk
            orders, address issues, holidays, weather, or carrier delays may affect delivery.
            Tracking is provided when available.
          </p>
          <p className="mt-4">
            If dispatch is delayed beyond our processing time, we will offer a revised date or
            cancellation with a refund, as required by applicable law.
          </p>
        </section>
        <section className="scroll-mt-8" id="returns">
          <h2>Returns</h2>
          <p>
            Request a return within <strong>{returnWindow} days of delivery</strong>. Items must be
            unused, unopened, unaltered, and in their original sealed packaging, with proof of
            purchase. Opened, used, unsealed, or contaminated gloves and masks are not eligible
            unless they arrived damaged, defective, or incorrect.
          </p>
          <p className="mt-4">
            Contact us before returning items. Have your order number, item, quantity, and reason
            ready. Use the return address and instructions we provide, and keep your shipping
            receipt and tracking number.
          </p>
        </section>
        <section className="scroll-mt-8" id="damaged-items">
          <h2>Damaged or incorrect items</h2>
          <p>
            Report damaged, defective, or incorrect items promptly. Keep the packaging and take
            clear photos. Once verified, OralNex will arrange a replacement or refund and provide
            any return instructions.
          </p>
        </section>
        <section className="scroll-mt-8" id="exchanges">
          <h2>Exchanges</h2>
          <p>
            To change a product or option, request an eligible return and place a new order after we
            confirm the return instructions. We do not offer automatic exchanges or gift credits.
          </p>
        </section>
        <section className="scroll-mt-8" id="refunds">
          <h2>Refunds</h2>
          <p>
            We inspect returned items and notify you of approval, rejection, or any reduced refund.
            Approved refunds cover eligible items and applicable sales tax and go to the original
            payment method. Your bank may need additional time to post the refund.
          </p>
          <p className="mt-4">
            Original shipping charges are refundable only for verified damage, defects, or OralNex
            fulfillment errors. Customers are responsible for other return-shipping costs. If a
            refund has not appeared, check with your bank before contacting us.
          </p>
        </section>
        <section className="scroll-mt-8" id="contact">
          <h2>Questions or returns</h2>
          <p>
            <Link href="/contact">Visit our contact page</Link> for help with shipping, returns, or
            refunds. Have your order number ready.
          </p>
        </section>
      </PolicyDocumentLayout>
      <SiteFooter />
    </>
  );
}
