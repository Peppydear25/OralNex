import { expect, it, vi } from "vitest";
import { registerBuyer } from "./register-buyer";

const details = {
  email: "buyer@example.com",
  password: "long-test-password",
  firstName: "Test",
  lastName: "Buyer",
};

it("registers with profile metadata and returns the immediate authenticated session", async () => {
  const response = {
    data: { user: { id: "buyer-1" }, session: { access_token: "test-session" } },
    error: null,
  };
  const signUp = vi.fn().mockResolvedValue(response);
  expect(await registerBuyer({ signUp }, details)).toBe(response);
  expect(signUp).toHaveBeenCalledWith({
    email: details.email,
    password: details.password,
    options: { data: { first_name: "Test", last_name: "Buyer" } },
  });
});

it("does not grant dashboard access when Supabase still requires confirmation", async () => {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: { id: "buyer-1", identities: [{}] }, session: null },
    error: null,
  });
  await expect(registerBuyer({ signUp }, details)).rejects.toMatchObject({
    code: "signup_session_unavailable",
  });
});

it("recognizes an obfuscated duplicate account instead of reporting successful signup", async () => {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: { identities: [] }, session: null },
    error: null,
  });
  await expect(registerBuyer({ signUp }, details)).rejects.toMatchObject({
    code: "user_already_exists",
  });
});

it("preserves provider errors for existing error handling", async () => {
  const error = { code: "weak_password" };
  const signUp = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error });
  await expect(registerBuyer({ signUp }, details)).rejects.toBe(error);
});

it("propagates network failures to the form's recovery handler", async () => {
  const error = new TypeError("fetch failed");
  const signUp = vi.fn().mockRejectedValue(error);
  await expect(registerBuyer({ signUp }, details)).rejects.toBe(error);
});
