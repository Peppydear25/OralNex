import { expect, it } from "vitest";
import { wholeInches } from "../lib/shipping/measurements";

it("does not add an inch to exact centimetre conversions", () => {
  for (let inches = 1; inches <= 108; inches++) {
    const cm = Number((inches * 2.54).toFixed(3));
    expect(wholeInches(cm / 2.54)).toBe(inches);
  }
});

it("rounds real fractional inches up, including very small parcels", () => {
  expect(wholeInches(33.021 / 2.54)).toBe(14);
  expect(wholeInches(13.000000001)).toBe(14);
  expect(wholeInches(0.000001)).toBe(1);
});
