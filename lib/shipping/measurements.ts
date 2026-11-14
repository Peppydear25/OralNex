/** Round fractional inches up, ignoring only floating-point conversion noise. */
export function wholeInches(value: number) {
  const nearest = Math.round(value);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 4;
  return nearest > 0 && Math.abs(value - nearest) <= tolerance ? nearest : Math.ceil(value);
}
