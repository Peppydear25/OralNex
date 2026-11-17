import { BUSINESS_ADDRESS } from "../business";

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!,
  );
}

/** Inline styles and presentation tables provide a usable fallback without media queries. */
export function emailShell(
  title: string,
  intro: string,
  content: string,
  url: string,
  action = "Visit OralNex",
  variant: "order" | "contact-admin" | "contact-customer" = "order",
) {
  const logoUrl = "cid:oralnex-logo";
  const contact = variant !== "order";
  const logoSize = 68;
  const headingSize = variant === "contact-customer" ? 24 : variant === "contact-admin" ? 21 : 23;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escapeHtml(title)}</title>
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}table{border-collapse:collapse}a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
@media screen and (max-width:480px){.outer{padding:12px 8px!important}.content{padding:28px 20px!important}.heading{font-size:24px!important;line-height:32px!important}.contact-heading{font-size:21px!important;line-height:28px!important}.footer{padding:20px!important}}
@media (prefers-color-scheme:dark){.page{background-color:#152329!important}.card{background-color:#203138!important;color:#f0f6f7!important}.muted{color:#bdcdd2!important}.footer{background-color:#192a31!important;color:#bdcdd2!important}a{color:#67d3dc}}
</style></head>
<body class="page" style="margin:0;padding:0;width:100%;background-color:#f2f6f7;color:#19323b;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(title)} — OralNex</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="outer" align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;color:#071b51;border:1px solid #e1e7ee;border-radius:16px;overflow:hidden">
${contact ? "" : `<tr><td align="center" bgcolor="#ffffff" style="padding:20px 28px 18px;border-bottom:4px solid #09a5b2;background-color:#ffffff;text-align:center"><img src="${escapeHtml(logoUrl)}" alt="OralNex" width="${logoSize}" height="${logoSize}" style="display:block;width:${logoSize}px;height:${logoSize}px;margin:0 auto;border:0;color:#087f8c;font-family:Arial,Helvetica,sans-serif;font-size:16px"></td></tr>`}
<tr><td class="content" align="left" style="padding:${variant === "contact-customer" ? "62px 42px 50px" : "38px 42px 40px"};overflow-wrap:anywhere;word-break:break-word;text-align:left">
<h1 class="heading${contact ? " contact-heading" : ""}" style="margin:0 0 ${variant === "contact-customer" ? "24px" : "16px"};font-size:${headingSize}px;line-height:${variant === "contact-customer" ? "32px" : "29px"};font-weight:700;letter-spacing:-.5px">${escapeHtml(title)}</h1>
${intro ? `<p class="muted" style="margin:0 0 24px;color:#34456b;font-size:14px;line-height:23px">${intro}</p>` : ""}
${content}
${url ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td bgcolor="#087f8c" style="border-radius:6px;text-align:center;mso-padding-alt:14px 24px"><a href="${escapeHtml(url)}" style="display:inline-block;border:1px solid #087f8c;border-radius:6px;background-color:#087f8c;padding:13px 23px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(action)}</a></td></tr></table>` : ""}
</td></tr><tr><td class="footer muted" style="padding:20px 42px;background-color:#f3f6fb;border-top:1px solid #dce7e9;color:#53658b;font-size:12px;line-height:19px;text-align:${contact ? "center" : "left"}">OralNex · Dental &amp; medical supplies<br>${escapeHtml(BUSINESS_ADDRESS.full)}</td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

export function referenceBlock(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #dce7e9;border-bottom:1px solid #dce7e9"><tr><td class="muted" style="padding:12px 8px 12px 0;font-size:13px;color:#536973">${escapeHtml(label)}</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:700;letter-spacing:.5px;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td></tr></table>`;
}
