/** Sentence-case an address field while preserving a leading street number. */
export function formatAddressText(value: string | undefined): string {
  if (!value) return "";
  const lower = value.toLocaleLowerCase("en-US");
  return lower.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("en-US"));
}
