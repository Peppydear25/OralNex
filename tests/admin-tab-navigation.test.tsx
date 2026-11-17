import { afterEach, expect, it, vi } from "vitest";
import { AdminTabLink, openAdminTab } from "../app/admin/admin-tab-link";
import { parseAdminTab } from "../app/admin/admin-navigation";

afterEach(() => vi.unstubAllGlobals());

it("switches sections through browser history without a server navigation", () => {
  const pushState = vi.fn();
  vi.stubGlobal("window", {
    location: { pathname: "/admin", search: "" },
    history: { pushState },
  });
  const preventDefault = vi.fn();
  const link = AdminTabLink({ tab: "inventory", children: "Inventory" });
  expect(link.props.href).toBe("/admin?tab=inventory");
  expect(link.props.prefetch).toBe(false);
  link.props.onNavigate({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(pushState).toHaveBeenCalledWith(null, "", "/admin?tab=inventory");
});

it("does not create another history entry for the current section", () => {
  const pushState = vi.fn();
  vi.stubGlobal("window", {
    location: { pathname: "/admin", search: "?tab=orders" },
    history: { pushState },
  });
  openAdminTab("orders");
  expect(pushState).not.toHaveBeenCalled();
});

it("resolves the overview after navigating back to a URL without a tab", () => {
  expect(
    parseAdminTab(new URL("https://example.com/admin").searchParams.get("tab") ?? undefined),
  ).toBe("overview");
  expect(parseAdminTab("retired-section")).toBe("overview");
});
