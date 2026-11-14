import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { isSupabaseConfigured } from "../../lib/supabase/config";

export async function getAccountSessionRole() {
  if (!isSupabaseConfigured()) return "anonymous" as const;
  const { data, error } = await (await createClient()).auth.getClaims();
  if (error || !data?.claims?.sub) return "anonymous" as const;
  return data.claims.user_role === "admin" ? ("admin" as const) : ("buyer" as const);
}

export async function redirectAdminFromBuyerAccount() {
  const role = await getAccountSessionRole();
  if (role === "admin") redirect("/admin");
  return role;
}

export async function requireBuyer() {
  const role = await getAccountSessionRole();
  if (role === "admin") redirect("/admin");
  if (role !== "buyer") redirect("/account");
}
