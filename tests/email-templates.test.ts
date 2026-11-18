import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { emailShell, referenceBlock } from "../lib/email/template";

it("provides mobile and email-client fallbacks with an embedded brand logo", () => {
  const html = emailShell(
    "Message received",
    "Thank you",
    referenceBlock("Reference", "<unsafe>"),
    "https://example.com/contact",
    "Contact us",
  );
  expect(html).toContain('name="viewport"');
  expect(html).toContain('role="presentation"');
  expect(html).toContain("[if mso]");
  expect(html).toContain("max-width:480px");
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).toContain("&lt;unsafe&gt;");
  expect(html).not.toContain("<script");
  expect(html).toContain('src="cid:oralnex-logo"');
  expect(html).toContain('alt="OralNex"');
});
