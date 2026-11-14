import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const US_PHONE_ERROR = "Enter a valid 10-digit US phone number, including the area code.";
export function normalizeUSPhone(value: unknown): string | null {
  if (typeof value !== "string" || !/^[+\d().\-\s]+$/.test(value) || value.length > 30) return null;
  const digits = value.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) return null;
  const phone = parsePhoneNumberFromString(value, { defaultCountry: "US", extract: false });
  return phone?.country === "US" && phone.isValid() && !phone.ext ? phone.number : null;
}
