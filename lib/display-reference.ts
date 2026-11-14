/** Display/search alias only; full database IDs remain authoritative. */
export function displayReference(id: string, kind: "order" | "contact") {
  const prefix = kind === "order" ? "ON" : "EN";
  const compact = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `${prefix}-${kind === "order" ? compact.slice(-8) : compact.slice(0, 8)}`;
}
