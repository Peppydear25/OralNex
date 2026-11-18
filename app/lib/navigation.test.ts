import { describe, expect, it } from "vitest";
import { safeBuyerPath, safeLocalPath } from "./navigation";

describe("safeLocalPath", () => {
  it("allows local paths and rejects external protocol-relative redirects", () => {
    expect(safeLocalPath("/checkout", "/")).toBe("/checkout");
    expect(safeLocalPath("//attacker.example", "/")).toBe("/");
    expect(safeLocalPath("/\\attacker.example", "/")).toBe("/");
    expect(safeLocalPath("/\n/attacker.example", "/")).toBe("/");
    expect(safeLocalPath("https://attacker.example", "/")).toBe("/");
  });
});

describe("safeBuyerPath", () => {
  it("prevents buyer authentication from redirecting into admin routes", () => {
    expect(safeBuyerPath("/checkout")).toBe("/checkout");
    expect(safeBuyerPath("/admin")).toBe("/account/dashboard");
    expect(safeBuyerPath("/admin?tab=orders")).toBe("/account/dashboard");
    expect(safeBuyerPath("/admin/sign-in")).toBe("/account/dashboard");
    expect(safeBuyerPath("/shop/../admin")).toBe("/account/dashboard");
  });
});
