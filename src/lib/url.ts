// Always returns the site address with no spaces, line breaks or trailing slash,
// even if the environment variable was saved with a stray newline.
export const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "") || "https://www.yeboinvoices.com";
