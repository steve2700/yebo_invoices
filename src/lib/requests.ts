import { isEmail } from "@/lib/email";

export type CleanRequest = { name: string; whatsapp: string; email: string; location: string; details: string };

// Checks what a stranger typed into the public request form. Returns the cleaned values or a short message for them.
export function cleanRequest(input: Record<string, unknown>): { ok: true; value: CleanRequest } | { ok: false; error: string } {
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const name = text(input.name, 80);
  const email = text(input.email, 120);
  const location = text(input.location, 100);
  const details = typeof input.details === "string" ? input.details.replace(/\r\n/g, "\n").trim().slice(0, 1500) : "";
  const rawPhone = text(input.whatsapp, 30);
  const digits = rawPhone.replace(/\D/g, "");

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (details.length < 8) return { ok: false, error: "Please tell us a bit more about the job." };
  if (!digits && !email) return { ok: false, error: "Please give a WhatsApp number or an email so we can reply." };
  if (digits && (digits.length < 9 || digits.length > 15)) return { ok: false, error: "That phone number does not look right." };
  if (email && !isEmail(email)) return { ok: false, error: "That email address does not look right." };
  return { ok: true, value: { name, whatsapp: digits ? rawPhone.replace(/[^\d+]/g, "") : "", email, location, details } };
}

// The last 9 digits, so 082 123 4567 and +27 82 123 4567 are recognised as the same number.
export const phoneKey = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "").slice(-9);

export const requestUrl = (base: string, token: string) => `${base}/r/${token}`;

export const shareText = (businessName: string, url: string) =>
  `Hi, this is ${businessName}. Tell me about the job here and I will send you a clear quote: ${url}`;
