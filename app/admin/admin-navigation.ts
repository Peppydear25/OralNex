import type { AdminTab } from "./dashboard/types";

export const adminNavigation = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "inventory", label: "Inventory", icon: "inventory" },
  { id: "orders", label: "Orders", icon: "orders" },
  { id: "categories", label: "Categories", icon: "categories" },
] as const satisfies ReadonlyArray<{ id: AdminTab; label: string; icon: string }>;

export function parseAdminTab(value: string | undefined): AdminTab {
  return adminNavigation.some((item) => item.id === value) ? (value as AdminTab) : "overview";
}
