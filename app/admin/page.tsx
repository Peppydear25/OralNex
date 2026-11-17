import type { Metadata } from "next";
import { AdminShell } from "./admin-shell";
import { parseAdminTab } from "./admin-navigation";
import { requireAdmin } from "./auth";
import { AdminDashboard } from "./dashboard";
import { AdminAuthFeedback } from "./auth-feedback";

export const metadata: Metadata = {
  title: "Inventory Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; auth?: string }>;
}) {
  await requireAdmin();
  const { tab, auth } = await searchParams;
  const initialTab = parseAdminTab(tab);

  return (
    <AdminShell activeTab={initialTab}>
      <AdminDashboard
        initialTab={initialTab}
        checkoutReady={Boolean(
          process.env.CHECKOUT_ENABLED === "true" &&
          process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_WEBHOOK_SECRET,
        )}
      />
      <AdminAuthFeedback status={auth === "signed-in" ? "signed-in" : undefined} />
    </AdminShell>
  );
}
