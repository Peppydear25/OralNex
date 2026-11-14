import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getClaims, rpc, redirect, configured } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
  configured: { value: true },
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../lib/supabase/config", () => ({ isSupabaseConfigured: () => configured.value }));
vi.mock("../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, rpc }),
}));
import { hasAdminSession, requireAdmin } from "../app/admin/auth";

afterEach(() => {
  configured.value = true;
  vi.clearAllMocks();
});

it("denies admin access when Supabase is unavailable", async () => {
  configured.value = false;
  expect(await hasAdminSession()).toBe(false);
  expect(getClaims).not.toHaveBeenCalled();
});

it.each([
  [{ user_role: "buyer", aal: "aal2" }, false],
  [{ user_role: "admin", aal: "aal1" }, false],
  [{ user_role: "admin", aal: "aal2" }, true],
])("requires both admin role and MFA for claims %j", async (claims, allowed) => {
  getClaims.mockResolvedValue({ data: { claims }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
  expect(await hasAdminSession()).toBe(allowed);
  expect(rpc).toHaveBeenCalledTimes(allowed ? 1 : 0);
});

it("denies a previously issued admin token after the database role is revoked", async () => {
  getClaims.mockResolvedValue({
    data: { claims: { user_role: "admin", aal: "aal2" } },
    error: null,
  });
  rpc.mockResolvedValue({ data: false, error: null });
  expect(await hasAdminSession()).toBe(false);
  expect(rpc).toHaveBeenCalledWith("is_admin");
});

it("fails closed when the live role check is unavailable", async () => {
  getClaims.mockResolvedValue({
    data: { claims: { user_role: "admin", aal: "aal2" } },
    error: null,
  });
  rpc.mockResolvedValue({ data: null, error: new Error("database unavailable") });
  expect(await hasAdminSession()).toBe(false);
});

it("rejects a failed claim verification", async () => {
  getClaims.mockResolvedValue({ data: { claims: { user_role: "admin", aal: "aal2" } }, error: {} });
  expect(await hasAdminSession()).toBe(false);
});

it("redirects a non-admin before rendering the dashboard", async () => {
  getClaims.mockResolvedValue({ data: { claims: { user_role: "buyer", aal: "aal2" } } });
  await expect(requireAdmin()).rejects.toThrow("redirected");
  expect(redirect).toHaveBeenCalledWith("/admin/sign-in");
});
