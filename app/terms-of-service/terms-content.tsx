import Link from "next/link";
import { PolicyDocumentLayout } from "../components/policy-document-layout";
import { BUSINESS_CONTACT } from "../../lib/business";
import { getReturnWindowDays } from "../../lib/returns";

type Props = {
  companyName: string;
};

export function TermsContent({ companyName }: Props) {
  return (
    <PolicyDocumentLayout
      title="Terms of Service"
      description={`These Terms govern use of the ${companyName} storefront and purchases from OralNex.`}
    >
      <section className="scroll-mt-8" id="use">
        <h2>Using OralNex</h2>
        <p>
          By using the store or ordering, you agree to these Terms and our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>. You must be at least 18 and legally
          able to contract. If ordering for an organization, you confirm that you may act for it.
        </p>
        <p className="mt-4">
          Product information is not medical advice. Follow product instructions.
        </p>
      </section>

      <section className="scroll-mt-8" id="orders">
        <h2>Orders, pricing, and payment</h2>
        <p>
          Product details, prices, and stock may change. We may correct errors, limit quantities, or
          cancel an order for unavailable stock, payment failure, address problems, suspected fraud,
          or unlawful activity. Any captured payment for a cancelled order will be refunded.
        </p>
        <p className="mt-4">
          Prices are in US dollars. Taxes, shipping, and other disclosed charges appear at checkout,
          and Stripe processes payment. Fully paid orders are subject to the processing, delivery,
          {getReturnWindowDays()}-day return, and refund terms on our{" "}
          <Link href="/shipping-policy">Shipping &amp; Returns</Link> page, which forms part of
          these Terms.
        </p>
      </section>

      <section className="scroll-mt-8" id="accounts">
        <h2>Accounts and acceptable use</h2>
        <p>
          Guest checkout is available. Account holders must provide accurate information, protect
          credentials, and report unauthorized access. Do not misuse payments, impersonate others,
          attack the store, introduce malware, or use OralNex unlawfully. We may suspend access or
          cancel affected orders.
        </p>
      </section>

      <section className="scroll-mt-8" id="legal">
        <h2>Ownership, liability, and contact</h2>
        <p>
          OralNex’s storefront, content, and branding are owned by or licensed to {companyName}. To
          the extent allowed by law, OralNex is not liable for indirect or consequential loss, and
          liability relating to an order is limited to the amount paid for that order. Rights that
          cannot legally be excluded remain unaffected.
        </p>
        <p className="mt-4">
          These Terms are governed by applicable United States law, except where consumer law
          requires otherwise.
        </p>
        <p className="mt-4">
          For questions about these Terms, call{" "}
          <a href={`tel:${BUSINESS_CONTACT.phone}`}>{BUSINESS_CONTACT.phoneDisplay}</a>.
        </p>
      </section>
    </PolicyDocumentLayout>
  );
}
