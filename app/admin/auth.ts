import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export async function hasAdminSession() {
  if (!isSupabaseConfigured()) return false;
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || data?.claims?.user_role !== "admin" || data.claims.aal !== "aal2") return false;

  // The JWT can remain valid after the role has been removed. The database
  // function checks the current assignment and is shared with RLS policies.
  const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
  return !roleError && isAdmin === true;
}

export async function requireAdmin() {
  if (!(await hasAdminSession())) redirect("/admin/sign-in");
}
