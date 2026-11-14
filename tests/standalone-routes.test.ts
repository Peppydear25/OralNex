import { expect, it } from "vitest";
import { isStandaloneRoute } from "../lib/routing/standalone-routes";

it.each(["/admin/sign-in", "/auth/complete"])("skips catalog loading for %s", (path) => {
  expect(isStandaloneRoute(path)).toBe(true);
});

it.each(["/", "/shop", "/cart", "/checkout", "/admin", "/account"])(
  "keeps catalog providers for %s",
  (path) => {
    expect(isStandaloneRoute(path)).toBe(false);
  },
);
