"use client";
import { normalizeUSPhone, US_PHONE_ERROR } from "../../lib/us-phone";

export function USPhoneInput({
  className = "",
  defaultValue = "",
  required = true,
  placeholder = "2125550123",
}: {
  className?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <span className="flex min-w-0 items-center overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#0a8d99] focus-within:ring-2 focus-within:ring-[#0a8d99]/10">
      <span
        className="flex shrink-0 items-center gap-2 border-r border-slate-200 px-3 text-sm text-slate-700"
        aria-label="United States, country code plus one"
      >
        <span aria-hidden="true">🇺🇸</span> +1
      </span>
      <input
        className={`${className} min-w-0 flex-1 border-0! rounded-none! outline-none! ring-0!`}
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder}
        minLength={10}
        maxLength={10}
        pattern="[0-9]{10}"
        title={US_PHONE_ERROR}
        required={required}
        defaultValue={normalizeUSPhone(defaultValue)?.slice(2) ?? ""}
        onChange={(event) => {
          const value = event.currentTarget.value;
          event.currentTarget.setCustomValidity(
            (!value && !required) || normalizeUSPhone(value) ? "" : US_PHONE_ERROR,
          );
        }}
        onPaste={(event) => {
          const phone = normalizeUSPhone(event.clipboardData.getData("text"));
          event.preventDefault();
          if (phone) {
            event.currentTarget.value = phone.slice(2);
            event.currentTarget.setCustomValidity("");
          } else {
            event.currentTarget.setCustomValidity(US_PHONE_ERROR);
            event.currentTarget.reportValidity();
          }
        }}
      />
    </span>
  );
}
