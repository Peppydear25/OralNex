/** Display/search alias only; full database IDs remain authoritative. */
export function displayReference(id: string) {
  const compact = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `ON-${compact.slice(-8)}`;
}
