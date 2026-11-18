import { afterEach, expect, it, vi } from "vitest";

const { effects, exchange, getClaims, getUser, setSession } = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  exchange: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
  setSession: vi.fn(),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void) => effects.push(effect),
  useRef: () => ({ current: false }),
}));
vi.mock("../lib/supabase/client", () => ({
  createClient: () => ({
    auth: { exchangeCodeForSession: exchange, getClaims, getUser, setSession },
  }),
}));
import CompleteAuthenticationPage from "../app/auth/complete/page";

function start(search = "?code=single-use&next=/checkout", hash = "") {
  const replace = vi.fn();
  const replaceState = vi.fn();
  vi.stubGlobal("window", {
    location: {
      search,
      hash,
      pathname: "/auth/complete",
      replace,
    },
    history: { replaceState },
  });
  CompleteAuthenticationPage();
  return { replace, replaceState, effect: effects[0] };
}

afterEach(() => {
  effects.length = 0;
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it("exchanges a single-use code once when the effect runs twice", async () => {
  exchange.mockResolvedValue({ error: null });
  getClaims.mockResolvedValue({ data: { claims: { user_role: "buyer" } } });
  const { effect, replace } = start();
  effect();
  effect();
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout"));
  expect(exchange).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledOnce();
});

it("returns to sign-in after an unexpected authentication failure instead of spinning forever", async () => {
  exchange.mockRejectedValue(new Error("Network unavailable"));
  const { effect, replace, replaceState } = start();
  effect();
  await vi.waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/account?authError=expired_or_invalid_link"),
  );
  expect(replaceState).toHaveBeenCalledWith(null, "", "/auth/complete");
});

it("continues routing administrators through the protected sign-in page", async () => {
  exchange.mockResolvedValue({ error: null });
  getClaims.mockResolvedValue({ data: { claims: { user_role: "admin" } } });
  const { effect, replace } = start();
  effect();
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/sign-in"));
});

it.each(["buyer", "admin"])("sends %s recovery to the password reset page", async (role) => {
  exchange.mockResolvedValue({ error: null });
  getClaims.mockResolvedValue({ data: { claims: { user_role: role } } });
  const { effect, replace } = start("?code=single-use&next=/account/reset-password");
  effect();
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/account/reset-password"));
});

it("routes implicit recovery to the password reset page without a next parameter", async () => {
  setSession.mockResolvedValue({ error: null });
  getClaims.mockResolvedValue({ data: { claims: { user_role: "admin" } } });
  const { effect, replace } = start("", "#access_token=access&refresh_token=refresh&type=recovery");
  effect();
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/account/reset-password"));
});
