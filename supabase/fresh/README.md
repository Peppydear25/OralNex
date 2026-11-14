# Fresh OralNex database

Use this path only for a **new, empty Supabase project**. Run
`202611140002_oralnex_fresh.sql` once in the Supabase SQL Editor, then run
`../verify_setup.sql`. Do not also run the files in `../migrations` on this
project. The fresh bundle contains the current OralNex schema and required
functions/policies, but does not import catalog, customer, or order records.

The bundle is assembled from the historical migrations, excluding
`202609110002_seed_initial_catalog.sql` and the old default storefront row.
Some intermediate migrations create
objects that later migrations remove; the final schema excludes those retired
objects. For future schema changes, test on staging before production.

After applying the schema, create your own categories, products, variants,
stock, images, and storefront slides in the admin UI. The schema does not
create an admin account or grant an admin role.
