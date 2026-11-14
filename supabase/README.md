# Supabase setup

Supabase provides the storefront database, authentication, and product-media storage.

1. For a **new, empty project**, use the single fresh-project bundle in
   `supabase/fresh/202611140002_oralnex_fresh.sql`. It omits the historical
   catalog seed and leaves catalog, customers, and orders empty. Do not run
   `supabase/migrations` as well on that project.
2. For an **existing project only**, apply unapplied files in
   `supabase/migrations` in filename order. Back up production data and validate
   changes in staging first.
3. Run `supabase/verify_setup.sql` in the SQL Editor to check the schema, policies,
   functions, storage bucket, and address-limit trigger.
4. Configure Auth site/redirect URLs, including `http://localhost:3000/auth/callback`
   for development and your production callback URL.
5. Enable the `public.custom_access_token_hook` Custom Access Token hook in Supabase
   Auth. Administrator roles are stored in `public.user_roles`; admins must enroll
   in TOTP MFA. Never put administrator privileges in editable user metadata.
6. Set `SUPABASE_SECRET_KEY` on the server for verified Stripe order recording,
   request persistence, and database-backed API rate limiting. Never use a
   `NEXT_PUBLIC_` prefix for it. Apply `202610120001_api_rate_limits.sql` before
   deploying the matching application code; public forms and checkout fail closed
   when the rate-limit function is unavailable.

If an existing Supabase project reports `column storefront_settings.hero_slides does not exist`,
the database is missing `202609250001_responsive_hero_slides.sql`. Apply that
migration (and any other unapplied migrations in filename order) in the SQL
Editor after a backup. The storefront can temporarily read the older
`hero_images` column, but editing responsive hero slides requires the migration.
Run `verify_setup.sql` afterward; every listed object should report `ready`.

For the optimized administrator order list, apply
`202610260001_admin_list_optimization.sql` in staging after the earlier migrations.
The `202611080001_remove_unused_schema.sql` migration removes the obsolete quote
feed and the unused bulk-quote, legacy merchandising, daily-deal, and checkout
packing-plan objects. It deletes any rows in those legacy tables, so apply it
only to a fresh project or after
backing up data you intend to retain. The remaining historical migrations are
retained because they also establish schema still used by the application.
Fresh databases seed image paths that exist in `public/`. Existing databases
that still contain the retired image paths need a separate, reviewed data fix.
The contact-requests table remains in use by the server-side contact form, but
the retired admin Requests panel's browser read/update grants and indexes are
removed. Re-run `verify_setup.sql` after migrating. This streamlined migration
set is for a fresh database. If an
existing database already recorded any removed migration, reconcile its
migration history before using the Supabase CLI; do not reapply historical SQL.
On a database already serving significant traffic, schedule index
creation during a quiet period; ordinary `CREATE INDEX` can briefly block writes.

Keep Row Level Security enabled. Buyer profile, address, and order access is scoped
by the existing policies; catalog writes require an administrator MFA session.
The `product-media` bucket serves public catalog images with protected admin uploads.

Configure Stripe, USPS, tax, and transactional email using the root README and
`.env.example`. Test buyer isolation, admin MFA, image uploads, checkout, webhook
retries, and inventory updates in staging before enabling production checkout.
