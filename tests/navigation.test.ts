import { describe, expect, it } from "vitest";
import { safeLocalPath } from "../app/lib/navigation";

describe("safeLocalPath", () => {
  it("accepts internal application paths", () => {
    expect(safeLocalPath("/account/dashboard", "/")).toBe("/account/dashboard");
    expect(safeLocalPath("/checkout?step=payment", "/")).toBe("/checkout?step=payment");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeLocalPath("https://attacker.example", "/account")).toBe("/account");
    expect(safeLocalPath("//attacker.example/path", "/account")).toBe("/account");
    expect(safeLocalPath(undefined, "/account")).toBe("/account");
  });
});
