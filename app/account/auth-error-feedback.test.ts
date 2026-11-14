import { describe, expect, it } from "vitest";
import { getAuthErrorFeedback } from "./auth-error-feedback";

describe("getAuthErrorFeedback", () => {
  it("directs an existing customer to sign in", () => {
    expect(getAuthErrorFeedback("register", "email_exists").title).toContain("already exist");
  });

  it("explains email confirmation failures", () => {
    expect(getAuthErrorFeedback("signin", "email_not_confirmed").title).toBe(
      "Confirm your email first",
    );
  });

  it("does not expose unknown provider errors", () => {
    expect(getAuthErrorFeedback("register", "internal_secret_error")).toEqual({
      title: "We could not create your account",
      message: "Check your account details and connection, then try again shortly.",
    });
  });
});
