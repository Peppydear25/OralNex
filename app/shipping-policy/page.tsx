import type { Metadata } from "next";
import { BUSINESS_CONTACT } from "../../lib/business";
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
  const companyName = "Oral Nex";
  const processingTime = "1–2 working days";
  const returnWindow = getReturnWindowDays();
  return (
    <>
      <SiteHeader />
      <PolicyDocumentLayout
        title="Shipping & Returns"
        updatedDate="November 13, 2026"
        description={`How ${companyName} delivers orders and handles returns for gloves and masks.`}
      >
        <section className="scroll-mt-8" id="delivery">
          <h2>Shipping</h2>
          <p>
            Completed orders that have been paid in full are processed within
            <strong> {processingTime}</strong>. Working days are Monday through Friday, excluding
            federal holidays. Processing time starts after payment and the shipping address have
            been confirmed and does not include carrier transit time.
          </p>
          <p className="mt-4">
            Available delivery services and charges are shown at checkout. Delivery dates are
            estimates, not guarantees. Tracking is provided when available. Bulk orders, address
            issues, holidays, weather, and carrier disruptions may require additional time.
          </p>
          <p className="mt-4">
            If we cannot ship within the stated processing time, we will contact you about the delay
            and provide the option to agree to a revised date or cancel for a refund, as required by
            applicable law.
          </p>
        </section>
        <section className="scroll-mt-8" id="returns">
          <h2>Returns</h2>
          <p>
            You may request a return within <strong>{returnWindow} days after receipt</strong>. To
            qualify for a full refund, goods must be in their original condition: unused, unopened,
            unaltered, and in their original sealed packaging. Proof of purchase is required. For
            health and hygiene reasons, opened, used, unsealed, or contaminated gloves and masks
            cannot be returned unless they arrived damaged, defective, or incorrect.
          </p>
          <p className="mt-4">
            To start a return, call{" "}
            <a href={`tel:${BUSINESS_CONTACT.phone}`}>{BUSINESS_CONTACT.phoneDisplay}</a> before
            sending anything back. Have your order number, item, quantity, and reason ready. For
            damaged or incorrect goods, keep the packaging and take clear photos. Follow the return
            instructions and address we provide; do not send returns to our business address unless
            we direct you to. Retain your return tracking information, and consider a tracked or
            insured service for valuable shipments.
          </p>
        </section>
        <section className="scroll-mt-8" id="damaged-items">
          <h2>Damaged, defective, or incorrect items</h2>
          <p>
            Call <a href={`tel:${BUSINESS_CONTACT.phone}`}>{BUSINESS_CONTACT.phoneDisplay}</a>{" "}
            promptly if an order arrives damaged, defective, or incorrect. Have your order number
            ready and keep photos of the product and packaging so we can review the issue. If
            verified, we will arrange an appropriate replacement or refund and provide return
            instructions where needed.
          </p>
        </section>
        <section className="scroll-mt-8" id="exchanges">
          <h2>Exchanges</h2>
          <p>
            If an item arrives damaged, defective, or incorrect, call{" "}
            <a href={`tel:${BUSINESS_CONTACT.phone}`}>{BUSINESS_CONTACT.phoneDisplay}</a> so we can
            review a replacement or refund. For a different product or option, request a return
            under the eligibility rules above and place a new order after we confirm the return
            instructions. We do not offer gift credits or automatic exchanges.
          </p>
        </section>
        <section className="scroll-mt-8" id="refunds">
          <h2>Refunds and support</h2>
          <p>
            We will notify you after a returned item is received and inspected and tell you whether
            the refund is approved. An approved refund for the eligible goods and applicable sales
            tax is issued to the original payment method. Original shipping charges are refundable
            only when the return results from verified damage, a defect, or an OralNex fulfillment
            error. Buyers are responsible for other return-shipping costs. Banks and card issuers
            may need additional time to post an issued refund.
          </p>
          <p className="mt-4">
            If only some items in an order qualify, a refund may cover only those eligible items. We
            will explain any rejected return or reduced refund after inspection. Do not send items
            back without contacting us first so we can provide the correct instructions.
          </p>
          <p className="mt-4">
            If an approved refund has not appeared, first check the original payment account, then
            contact your card issuer or bank about its posting time. If you still need help, call{" "}
            <a href={`tel:${BUSINESS_CONTACT.phone}`}>{BUSINESS_CONTACT.phoneDisplay}</a> with your
            order number.
          </p>
        </section>
      </PolicyDocumentLayout>
      <SiteFooter />
    </>
  );
}
