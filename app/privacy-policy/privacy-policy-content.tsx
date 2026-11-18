import Link from "next/link";
import { BUSINESS_ADDRESS } from "../../lib/business";
import { PolicyDocumentLayout } from "../components/policy-document-layout";

type Props = { companyName: string };

export function PrivacyPolicyContent({ companyName }: Props) {
  return (
    <PolicyDocumentLayout
      title="Privacy Policy"
      updatedDate="November 11, 2026"
      description={`${companyName} explains in this policy what personal information we collect, why we use it, and the choices available when you use our US storefront.`}
    >
      <section className="scroll-mt-8" id="information">
        <h2>Information we collect</h2>
        <p>
          We collect identifiers and contact details; account and authentication details; shipping,
          order, payment-status, return, and transaction details; and information submitted through
          emails or phone calls. We receive this information from you and, where necessary, from
          payment, authentication, and delivery providers.
        </p>
        <p className="mt-4">
          We also collect limited technical information such as IP address, browser and device type,
          pages or features used, security events, error reports, and performance measurements.
          Stripe handles full payment-card details; OralNex does not store full card numbers or
          security codes. OralNex does not intentionally collect medical records or diagnoses, and
          product purchases alone are not treated as medical information.
        </p>
        <p className="mt-4">
          At checkout, we use the delivery address you provide to verify the address, obtain
          shipping quotes, calculate applicable tax, and fulfill your order. We do not request
          precise device location to do this.
        </p>
      </section>

      <section className="scroll-mt-8" id="use">
        <h2>How we use information</h2>
        <p>
          We use personal information to operate accounts and carts, verify and process payments,
          fulfill and deliver orders, manage inventory, respond to inquiries and returns, send
          transactional messages, prevent fraud, secure and improve the storefront, maintain
          business records, and comply with legal obligations. We limit collection and use to what
          is reasonably necessary for these purposes.
        </p>
      </section>

      <section className="scroll-mt-8" id="sharing">
        <h2>When we disclose information</h2>
        <p>
          We disclose only the information needed by service providers that support the store,
          including Supabase for accounts and data services, Stripe for payments and tax, EasyPost
          for address verification and shipping quotes, Resend for transactional communications, and
          carriers or fulfillment providers needed to deliver orders. We may also disclose
          information to professional advisers, authorities when legally required, or a successor in
          a business transaction subject to appropriate protections.
        </p>
        <p className="mt-4">
          OralNex does not sell personal information, share it for cross-context behavioral
          advertising, or use it for targeted advertising or qualifying automated profiling. If
          these practices change, we will update this policy and provide any legally required
          choices before using information for the new purpose.
        </p>
      </section>

      <section className="scroll-mt-8" id="international">
        <h2>Where information may be processed</h2>
        <p>
          OralNex serves customers in the United States. Our service providers may process or store
          information in other locations as part of providing their services. Where applicable law
          requires protections for an international transfer, we take steps to use appropriate
          safeguards.
        </p>
      </section>

      <section className="scroll-mt-8" id="retention">
        <h2>Retention and security</h2>
        <p>
          We retain information only as long as reasonably necessary for the purpose collected.
          Retention depends on account status, order fulfillment, return and support needs, fraud
          prevention, dispute resolution, and tax, accounting, and other legal requirements. We use
          administrative and technical safeguards appropriate to the information, but no online
          system can guarantee absolute security.
        </p>
        <p className="mt-4">
          When information is no longer needed, we delete or de-identify it where practicable.
          Records may remain in backups for a limited period or be retained where required for
          legal, accounting, or dispute purposes.
        </p>
      </section>

      <section className="scroll-mt-8" id="choices">
        <h2>Your privacy choices</h2>
        <p>
          Depending on your state, you may ask whether we process your information and request
          access, correction, deletion, or a portable copy. You may also exercise any applicable
          right to opt out of sale, targeted advertising, or qualifying profiling, although OralNex
          does not currently conduct those activities. We will not discriminate against you for
          exercising a privacy right and may verify your identity before completing a request.
        </p>
        <p className="mt-4">
          Submit a privacy request through our <Link href="/contact">contact page</Link> or write to
          {` ${BUSINESS_ADDRESS.full}`}. If we deny a request, contact us to appeal and explain why
          you believe the decision should be reconsidered. You may also contact your state attorney
          general where applicable.
        </p>
        <p className="mt-4">
          Account holders can update some profile and saved-address details in their account. A
          request to delete an account does not necessarily remove order or transaction records that
          we must retain for legitimate business or legal reasons.
        </p>
      </section>

      <section className="scroll-mt-8" id="storage">
        <h2>Browser storage and children</h2>
        <p>
          Essential cookies and browser storage support authentication, security, checkout, and the
          shopping cart. OralNex does not currently use advertising trackers or optional marketing
          cookies. Blocking essential storage may prevent some features from working. The store is
          not directed to children under 13, and we do not knowingly collect their personal
          information. A parent or guardian who believes a child submitted information should use
          our contact page so we can review and delete it where appropriate.
        </p>
      </section>

      <section className="scroll-mt-8" id="updates">
        <h2>Updates and contact</h2>
        <p>
          We may update this policy to reflect legal, operational, or service changes. The revised
          date will appear above, and material changes will receive additional notice when required.
          Submit privacy questions through the <Link href="/contact">contact page</Link> or write to
          {` ${companyName}, ${BUSINESS_ADDRESS.full}`}.
        </p>
      </section>
    </PolicyDocumentLayout>
  );
}
