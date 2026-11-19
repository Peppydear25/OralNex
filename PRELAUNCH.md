# OralNex release gates

Code checks alone cannot establish a production security or performance score. Use a separate staging Supabase project, Stripe test mode, and an HTTPS staging URL. Never run purchase tests against live customer data. EasyPost checkout rates are implemented; label purchase and tracking webhooks remain a separate fulfillment stage. See `EASYPOST_TESTING.md`.

## 1. Local and staging configuration

Run `pnpm check`, `pnpm test`, and `pnpm build`. With staging environment variables loaded, run `pnpm prelaunch:check`. With production environment variables loaded, run `pnpm prelaunch:check --production`. The pre-launch command checks required names and modes without printing secret values; it does not contact providers.

For a new empty Supabase project, apply `supabase/fresh/202611140002_oralnex_fresh.sql` once in its SQL Editor. For an existing project, apply only unapplied files in `supabase/migrations`. Then run `supabase/verify_setup.sql`; confirm that every row says `ready`, including RLS and the API rate-limit function. Do not mix the fresh bundle and historical migration series on one project.

## 2. Security and access control

- From separate buyer accounts, verify that each account can read only its own profile, addresses, and orders. Confirm anonymous users cannot read them.
- Verify admin routes and catalog writes fail without a valid admin role **and** enrolled MFA; verify a buyer cannot grant themselves admin access.
- After applying `202611060002_live_admin_role_check.sql`, remove a test administrator's `user_roles` row while their session remains open. Confirm the next admin page and write request are denied without waiting for a token refresh.
- Test invalid and oversized JSON requests, cross-origin form and checkout requests, and tampered Stripe webhook signatures. Confirm rate limits return 429 and no customer or secret data appears in errors or monitoring.
- In a staging browser, inspect CSP violations on storefront, account, admin, and Stripe payment pages. Confirm all scripts function without `script-src 'unsafe-inline'`.
- Enable hosting-provider rate limits/WAF and log alerts before public traffic. Keep `.env*` secrets out of version control and rotate any credential that was ever exposed.

## 3. Order and fulfillment flows

- Use EasyPost test mode with Stripe test mode to purchase one box, several boxes, and a full carton for each configured variant. Compare the displayed subtotal, discount, shipping rate, Stripe Tax, charged total, order record, and stock decrement.
- Test two simultaneous buyers for the last unit: only one should reach payment. Test missing package data, carrier outage, Stripe failure, asynchronous payment, duplicate/retried webhook deliveries, and email-delivery retry. Open sessions temporarily reserve stock; failed or expired sessions must restore it exactly once without creating a paid order.
- Subscribe the Stripe webhook to `checkout.session.expired` and `checkout.session.async_payment_failed` as well as both success events. Test an expired session, a failed asynchronous payment, and a paid session whose browser never reaches the success page. Check that no `reserved` row remains past its `expires_at` without an investigated Stripe Session.
- Enable successful-payment receipts in Stripe and configure any desired team payment notifications. Verify webhook delivery in test mode and confirm receipt delivery using a controlled live payment; a receipt page is not proof of email delivery. Verify the Resend sender domain and test delivery of the separate asynchronous payment-failure notice.
- Compare each quote with the same physical shipment entered in the carrier's system using the actual packed weight, outside dimensions, account, and destination. Investigate any difference before launch.
- Refunds, cancellations, and disputes remain manual: define who monitors Stripe and handles customer contact, inventory adjustment, and fulfillment hold. A refund does not automatically restore inventory or shipping costs.

## 4. Performance, mobile, and SEO

- Run Lighthouse against a production build on staging, then collect real-user Core Web Vitals. At the 75th percentile, target LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1 on mobile and desktop.
- Profile the catalog fetch and route JavaScript bundles. The current root layout still fetches the catalog on every page; split route providers only after regression testing cart/account/admin behavior.
- After applying the admin-list migration, check the real Orders and Requests queries with Supabase query statistics and `EXPLAIN (ANALYZE, BUFFERS)` in staging. Confirm that paging, filtering, and search latency stay acceptable as the tables grow; only add further search indexes when the plans justify them.
- Test checkout, account recovery, navigation, product options, and admin editing on narrow Android and iOS screens, keyboard-only navigation, and a screen reader.
- Check canonical URLs, sitemap, robots rules, structured data, and 404 responses on the deployed domain.

Do not label the application “10/10” until these gates have evidence from the deployed staging environment and an independent security review.
