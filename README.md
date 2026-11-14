# OralNex storefront

OralNex is a responsive medical-equipment storefront and inventory-management prototype built with Next.js, React, TypeScript, and Tailwind CSS.

Brand motto: “Outlasting the Middle.”

## Technology

- Next.js 16 App Router
- React 19
- TypeScript in strict mode
- Tailwind CSS 4
- pnpm

## Local development

Requirements:

- Node.js 20 or newer
- pnpm 10 or newer

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000` for the storefront and `http://localhost:3000/admin` for inventory administration.

Administrator identities, UUID-backed roles, and mandatory MFA are managed through Supabase Auth.

## Commands

```bash
pnpm dev           # Start the development server
pnpm build         # Create a production build
pnpm start         # Run the production build
pnpm check         # Run formatting, lint, and TypeScript checks
pnpm test          # Run security and data-validation unit tests
pnpm lint          # Run ESLint
pnpm format        # Format maintained source files
pnpm format:check  # Verify formatting without changing files
pnpm prelaunch:check # Validate staging configuration from exported environment variables
```

## Project structure

```text
app/
├── account/                Buyer authentication, recovery, and account dashboard
├── auth/callback/          Supabase PKCE email and recovery callback
├── admin/                  Server-protected admin route and inventory UI
│   └── dashboard/          Focused inventory, category, merchandising, and order modules
├── components/             Shared storefront and policy components
├── data/                   Catalog seeds, validated browser state, cart, and account stores
├── lib/                    Shared browser-storage and consent utilities
├── products/[slug]/        Product detail route and product components
├── shop/                   Catalog filters, results, pagination, and state hook
└── *-policy/               Public legal and customer-care policy routes
public/                     Static product, brand, social, and payment assets
lib/supabase/               Browser/server clients and session refresh integration
proxy.ts                    Cookie-backed Supabase session refresh
supabase/                   Versioned schema, storage, and Row Level Security migration
```

## Environment variables

Use `.env.example` as the source of truth. Server secrets must never use a `NEXT_PUBLIC_` prefix.

- `SITE_URL`: canonical storefront URL used for page metadata and trusted checkout redirects. Set it to the exact HTTPS origin before production; checkout and public forms fail closed if it is missing or insecure.
- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key for trusted order and request operations
- `STRIPE_SECRET_KEY`: server-only Stripe test or live secret key
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/stripe/webhook`
- `STRIPE_AUTOMATIC_TAX_ENABLED`: enables Stripe Tax after business tax setup is complete
- Product tax category: configure the default in Stripe Tax settings. Checkout creates inline products and uses this account default, not tax codes on unrelated Dashboard products. No product tax-code environment variable is required. Shipping remains explicitly classified as shipping.
- `EASYPOST_API_KEY` and `EASYPOST_ORIGIN_*`: server-only EasyPost key and exact ship-from address. Checkout retrieves parcel rates and re-quotes the selected service before Stripe payment. See `EASYPOST_TESTING.md` before setting `CHECKOUT_ENABLED=true` in a test environment.

## Database and Supabase setup

The storefront automatically uses Supabase Auth when both Supabase environment variables are
present. Without them, the existing local account preview remains available for interface testing.

The versioned schema and activation checklist are in `supabase/README.md`. For a new empty
project, use the fresh-project SQL bundle; for an existing database, apply only unapplied
historical migrations. Test on staging before production.
The full security, checkout, mobile, and performance release gates are in `PRELAUNCH.md`.

Never expose database credentials or Supabase secret/service-role keys through a `NEXT_PUBLIC_`
variable. Authorization for application data is enforced server-side with verified identity and
Row Level Security; browser code must never be trusted to authorize a write.

## Current data model

The Supabase-backed PostgreSQL database currently provides:

- Persistent products, variants, categories, media, inventory, and storefront merchandising.
- Supabase email/password buyer authentication, account profiles, and saved delivery addresses.
- UUID-backed administrator roles with mandatory TOTP MFA for protected catalog operations.
- RLS-protected buyer order history and administrator order/request views.
- Atomic, idempotent order persistence reserved for verified Stripe webhooks.
- Server-only persistence boundaries for contact requests.
- Cart contents are stored locally on the buyer's device.
- Checkout is gated by configuration and recalculates prices, stock, packages, and carrier rates on the server; the browser cannot set a shipping charge. Automatic label purchase and tracking webhooks are not yet implemented.

Never treat browser storage as authoritative inventory, identity, pricing, payment, or order data.

## Production integration checklist

Before launch, replace preview state with server-side services:

1. Configure Supabase custom SMTP, CAPTCHA/rate limiting, production URL settings, backups, and alerts.
2. Add the Stripe server secret and the signing secret for `/api/stripe/webhook`.
3. On a new empty project, run `supabase/fresh/202611140002_oralnex_fresh.sql` once; on an existing project, apply only its unapplied historical migrations. Verify the schema before enabling test checkout.
4. Recalculate prices, discounts, shipping, and stock on the server at checkout.
5. Connect the selected carrier rates, labels, tracking, and fulfillment status updates.
6. Verify a Resend sending domain, configure `REQUEST_EMAIL_FROM` and
   `ADMIN_NOTIFICATION_EMAIL`, then enable `REQUEST_EMAIL_NOTIFICATIONS_ENABLED`.
7. Add deployment monitoring, dependency scanning, and end-to-end checkout tests.
8. Have qualified U.S. counsel approve the legal policies and medical-equipment sales requirements.

## Code quality

### Paid-order emails

The signed Stripe webhook records paid orders and sends a buyer confirmation and an admin notification through Resend.
Set `ORDER_EMAIL_NOTIFICATIONS_ENABLED=true`, `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`, and
`ORDER_EMAIL_FROM=OralNex Orders <orders@your-verified-domain.com>` on the deployment. If the order sender
is omitted, `REQUEST_EMAIL_FROM` is reused. Resend's `onboarding@resend.dev` sender is restricted to testing;
verify your own sending domain before accepting live customer orders. Stripe test-mode checkout stays
available with a test sender and attempts buyer/admin email when notifications are enabled. For local
testing, the verified receipt page also retries email for test payments when webhook forwarding
is unavailable. Resend's test sender may reject recipients outside its permitted test addresses. Live
checkout refuses to start when order email is disabled, missing, or configured with a test/placeholder
sender. The code cannot verify DNS ownership or actual inbox delivery; check the domain status and
delivery logs in Resend.

In Stripe, deliver `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired` to
`https://your-store-domain/api/stripe/webhook` and configure its matching `STRIPE_WEBHOOK_SECRET`.
For local testing, use Stripe CLI webhook forwarding to `localhost:3000/api/stripe/webhook` and its signing secret.
Email errors return a webhook failure so Stripe can retry; the batch uses the checkout session as its idempotency key.
After deployment, confirm the webhook endpoint is active in the same Stripe mode as checkout and
successfully delivers a test `checkout.session.completed` event. A successful receipt page alone does
not prove that the webhook or email provider delivered a confirmation.
The inventory-reservation migration must be installed before deploying reservation-aware checkout.
Pause checkout and let existing open Checkout Sessions finish or expire before switching to the new
order function; sessions created by older code have no reservation ID. New sessions reserve stock
before payment, settle the reservation when a paid order is recorded, and release it on expiry or
asynchronous payment failure. Keep the expiry webhook enabled and monitor reserved rows that remain
past `expires_at`; investigate their Stripe Session state before any manual stock correction.

### Storefront layout

The storefront uses locally bundled Inter, responsive section headings, and two-column mobile product
grids. Homepage content uses a centered 1600px maximum width with responsive side margins; interior
storefront content uses 1280px. The homepage hero, header, and footer follow the same content edges.

Run these before opening a pull request:

```bash
pnpm check
pnpm build
```
