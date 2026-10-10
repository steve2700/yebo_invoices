import { readableOn } from "./color";

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value.trim());

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  replyTo?: string | null;
  // Resend ignores a second send with the same key within 24 hours, so a retry can never double-send.
  idempotencyKey?: string;
};

// Sends one email through Resend from noreply@<RESEND_EMAIL_DOMAIN>. Returns true only if Resend accepted it.
// It never throws: callers decide what to do when an email could not be sent.
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set.");
    return false;
  }
  const domain = process.env.RESEND_EMAIL_DOMAIN ?? "resend.dev";
  const fromName = input.fromName.replace(/[<>"\r\n]/g, "").trim() || "Yebo Invoices";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${fromName} <noreply@${domain}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo && isEmail(input.replyTo) ? { reply_to: input.replyTo.trim() } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("[email] Resend rejected the email:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] could not send:", error);
    return false;
  }
}

type RenderEmailInput = {
  brandColor?: string | null;
  heading: string;
  intro: string;
  rows?: [string, string][];
  note?: string | null;
  buttonLabel: string;
  buttonUrl: string;
  secondaryButtonLabel?: string | null;
  secondaryButtonUrl?: string | null;
  footer?: string | null;
};

// A simple, clean email that works in every mail app (inline styles only). All text is escaped.
export function renderEmail(input: RenderEmailInput) {
  const color = /^#[0-9a-f]{6}$/i.test(input.brandColor ?? "") ? (input.brandColor as string) : "#0F8A5F";
  const rows = (input.rows ?? [])
    .map(
      ([name, value]) =>
        `<tr><td style="padding:8px 0;color:#5b6b63;font-size:14px">${escapeHtml(name)}</td><td style="padding:8px 0;text-align:right;font-weight:700;font-size:14px;color:#10241b">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f4f7f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${color};height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#10241b">${escapeHtml(input.heading)}</h1></td></tr>
<tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.6;color:#33453c">${escapeHtml(input.intro)}</td></tr>
${rows ? `<tr><td style="padding:12px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3ebe6;border-bottom:1px solid #e3ebe6">${rows}</table></td></tr>` : ""}
${input.note ? `<tr><td style="padding:16px 28px 0;font-size:14px;line-height:1.6;color:#8a4b00;background:#ffffff"><div style="background:#fff4e5;border-radius:10px;padding:12px 14px">${escapeHtml(input.note)}</div></td></tr>` : ""}
<tr><td style="padding:24px 28px 16px"><a href="${escapeHtml(input.buttonUrl)}" style="display:inline-block;background:${color};color:${readableOn(color)};text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;margin:0 8px 8px 0">${escapeHtml(input.buttonLabel)}</a>${input.secondaryButtonLabel && input.secondaryButtonUrl ? `<a href="${escapeHtml(input.secondaryButtonUrl)}" style="display:inline-block;background:#ffffff;color:#10241b;text-decoration:none;font-weight:700;font-size:15px;padding:11px 20px;border-radius:12px;border:2px solid ${color};margin:0 8px 8px 0">${escapeHtml(input.secondaryButtonLabel)}</a>` : ""}</td></tr>
${input.footer ? `<tr><td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#6b7b73">${escapeHtml(input.footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
