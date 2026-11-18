import { expect, it } from "vitest";
import { displayReference } from "../lib/display-reference";

it("provides short repeatable aliases without modifying internal IDs", () => {
  expect(displayReference("ON-7SRR9EI1XWK3")).toBe("ON-9EI1XWK3");
});
