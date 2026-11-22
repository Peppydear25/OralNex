import Link from "next/link";
import { PolicyDocumentLayout } from "../components/policy-document-layout";
import { getReturnWindowDays } from "../../lib/returns";

type Props = {
  companyName: string;
};

export function TermsContent({ companyName }: Props) {
  return (
    <PolicyDocumentLayout
      title="Terms of Service"
      updatedDate="November 22, 2026"
      description={`These Terms apply to shopping with OralNex, operated by ${companyName}.`}
    >
      <section className="scroll-mt-8" id="use">
        <h2>Using OralNex</h2>
        <p>
          Using OralNex or placing an order means you accept these Terms and our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>. You must be at least 18, legally able
          to contract, and authorized to order for any organization you represent.
        </p>
        <p className="mt-4">
          Product information is not medical advice. Follow product instructions.
        </p>
      </section>

      <section className="scroll-mt-8" id="orders">
        <h2>Orders, pricing, and payment</h2>
        <p>
          Prices and availability may change. We may correct errors, limit quantities, or cancel
          orders because of unavailable stock, payment or address issues, suspected fraud, or
          unlawful activity. Payments collected for cancelled orders will be refunded.
        </p>
        <p className="mt-4">
          Prices are in US dollars; taxes, shipping, and other charges appear at checkout. Stripe
          processes payments. Our <Link href="/shipping-policy">Shipping &amp; Returns</Link> policy
          forms part of these Terms and covers processing, delivery, eligible
          {` ${getReturnWindowDays()}-day returns`}, and refunds for fully paid orders.
        </p>
      </section>

      <section className="scroll-mt-8" id="accounts">
        <h2>Accounts and acceptable use</h2>
        <p>
          Guest checkout is available. Keep account details accurate, protect your password, and
          report unauthorized access. Fraud, impersonation, payment abuse, malware, attacks on the
          store, and unlawful use are prohibited. We may suspend access or cancel affected orders.
        </p>
      </section>

      <section className="scroll-mt-8" id="legal">
        <h2>Ownership and liability</h2>
        <p>
          OralNex’s content and branding are owned by or licensed to {companyName}. Where permitted
          by law, liability for an order is limited to the amount paid, and indirect or
          consequential losses are excluded. Your rights that cannot legally be excluded remain
          unaffected.
        </p>
        <p className="mt-4">
          These Terms are governed by applicable United States law, except where consumer law
          requires otherwise.
        </p>
      </section>
      <section className="scroll-mt-8" id="contact">
        <h2>Questions</h2>
        <p>
          For questions about these Terms, <Link href="/contact">visit our contact page</Link>.
        </p>
      </section>
    </PolicyDocumentLayout>
  );
}
