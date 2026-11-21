import type { SupabaseClient } from "@supabase/supabase-js";

class RegistrationError extends Error {
  constructor(public code: string) {
    super("Account registration could not establish a session.");
    this.name = "RegistrationError";
  }
}

export async function registerBuyer(
  auth: Pick<SupabaseClient["auth"], "signUp">,
  details: { email: string; password: string; firstName: string; lastName: string },
) {
  const response = await auth.signUp({
    email: details.email,
    password: details.password,
    options: { data: { first_name: details.firstName, last_name: details.lastName } },
  });
  if (response.error) throw response.error;
  if (!response.data.session || !response.data.user) {
    throw new RegistrationError(
      response.data.user?.identities?.length === 0
        ? "user_already_exists"
        : "signup_session_unavailable",
    );
  }
  return response;
}
