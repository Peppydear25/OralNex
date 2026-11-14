import { expect, it } from "vitest";
import { displayReference } from "../lib/display-reference";

it("provides short repeatable aliases without modifying internal IDs", () => {
  expect(displayReference("ON-7SRR9EI1XWK3", "order")).toBe("ON-9EI1XWK3");
  expect(displayReference("a1234567-1234-4567-8901-123456789012", "contact")).toBe("EN-A1234567");
});
