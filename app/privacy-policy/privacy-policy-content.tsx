import Link from "next/link";
import { PolicyDocumentLayout } from "../components/policy-document-layout";

type Props = { companyName: string };

export function PrivacyPolicyContent({ companyName }: Props) {
  return (
    <PolicyDocumentLayout
      title="Privacy Policy"
      updatedDate="November 22, 2026"
      description={`How ${companyName} collects, uses, and protects personal information when you shop with OralNex.`}
    >
      <section className="scroll-mt-8" id="information">
        <h2>Information we collect</h2>
        <p>
          We collect contact details, account credentials, delivery addresses, order and payment
          records, return details, and information you share with support. Information comes from
          you and our payment, authentication, and delivery providers. We also collect IP addresses,
          browser and device details, site activity, security events, and error and performance
          data.
        </p>
        <p className="mt-4">
          Payment providers process card payments; OralNex does not store full card numbers or
          security codes. We do not intentionally collect medical records or diagnoses, and
          purchases alone are not treated as medical information.
        </p>
      </section>
      <section className="scroll-mt-8" id="use">
        <h2>How we use information</h2>
        <p>
          We use information as reasonably needed to manage accounts and carts, process payments,
          fulfill orders, manage inventory, handle support and returns, send order updates, prevent
          fraud, secure and improve the store, keep business records, and meet legal obligations.
          Your delivery address is used for address verification, shipping quotes, tax, and
          delivery; we do not request precise device location for these services.
        </p>
      </section>
      <section className="scroll-mt-8" id="sharing">
        <h2>Sharing and processing</h2>
        <p>
          We share necessary information with account and data providers, payment and tax providers,
          address and shipping providers, and delivery providers. We may also disclose information
          to professional advisers, authorities when required, or a business successor with
          appropriate protections.
        </p>
        <p className="mt-4">
          OralNex does not sell personal information, share it for cross-context behavioral
          advertising, or use it for targeted advertising or qualifying automated profiling. We will
          update this policy and provide required choices before changing those practices.
        </p>
      </section>
      <section className="scroll-mt-8" id="international">
        <h2>Where information is processed</h2>
        <p>
          OralNex serves US customers. Providers may process information in other countries; we use
          safeguards for international transfers where required by law.
        </p>
      </section>
      <section className="scroll-mt-8" id="retention">
        <h2>Retention and security</h2>
        <p>
          We keep information only as reasonably needed for accounts, orders, support, fraud
          prevention, disputes, and legal, tax, or accounting requirements. We then delete or
          de-identify it where practicable. Some records may remain in backups temporarily or be
          retained as legally required. We use administrative and technical safeguards, but no
          online system is completely secure.
        </p>
      </section>
      <section className="scroll-mt-8" id="choices">
        <h2>Your privacy choices</h2>
        <p>
          Depending on your state, you may request confirmation of processing, access, correction,
          deletion, or a portable copy of your information. Applicable opt-out rights also remain
          available, although we do not sell data or conduct targeted advertising or qualifying
          profiling. We may verify your identity and will not discriminate against you for
          exercising these rights.
        </p>
        <p className="mt-4">
          Use the contact details below for requests or to appeal a denial, explaining why we should
          reconsider. You may also contact your state attorney general where applicable. Account
          holders can edit profile and saved-address details; deleting an account does not remove
          records we must retain for legitimate business or legal reasons.
        </p>
      </section>
      <section className="scroll-mt-8" id="storage">
        <h2>Cookies, browser storage, and children</h2>
        <p>
          Cookies and browser storage support sign-in, security, checkout, carts, and cached catalog
          content. We do not use advertising trackers or optional marketing cookies. Blocking
          essential storage may affect store features.
        </p>
        <p className="mt-4">
          The store is not directed to children under 13, and we do not knowingly collect their
          personal information. Parents or guardians can contact us to request review and deletion.
        </p>
      </section>
      <section className="scroll-mt-8" id="updates">
        <h2>Updates and contact</h2>
        <p>
          We update this policy as our services or requirements change. The revised date appears
          above; material changes receive additional notice when required.
        </p>
        <p className="mt-4">
          For privacy questions or requests, <Link href="/contact">visit our contact page</Link>.
        </p>
      </section>
    </PolicyDocumentLayout>
  );
}
