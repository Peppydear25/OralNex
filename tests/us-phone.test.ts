import { expect, it } from "vitest";
import { normalizeUSPhone } from "../lib/us-phone";

it.each(["2125550123", "(212) 555-0123", "+1 212 555 0123", "12125550123"])(
  "normalizes US number %s",
  (value) => {
    expect(normalizeUSPhone(value)).toBe("+12125550123");
  },
);
it.each([
  "",
  "212555012",
  "21255501234",
  "+442079460018",
  "+14165550123",
  "+12425550123",
  "0000000000",
  "5555550123",
  "2125550123 ext 4",
  "call 2125550123",
  null,
  2125550123,
])("rejects invalid/non-US number %s", (value) => {
  expect(normalizeUSPhone(value)).toBeNull();
});
