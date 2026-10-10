import { createHash, timingSafeEqual } from "node:crypto";
import { promises as dns } from "node:dns";

export const PAYFAST_LIVE_URL = "https://www.payfast.co.za/eng/process";
export const PAYFAST_SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";

// PayFast needs a minimum transaction amount. We stay on the safe side of it.
export const MIN_ONLINE_PAYMENT_CENTS = 500;

// PayFast signs values the way PHP's urlencode() does: spaces become "+", and everything except
// letters, numbers and - _ . is percent-encoded with UPPERCASE hex. JavaScript's encodeURIComponent
// leaves a few extra characters alone, so patch those.
export function payfastEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

// 12345 cents -> "123.45" (integer maths only, so there is never a rounding error).
export function formatPayfastAmount(cents: number) {
  const whole = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${whole}.${String(remainder).padStart(2, "0")}`;
}

// MD5 of the fields in the exact order they are sent (blank ones left out), URL-encoded and joined with "&",
// with the passphrase added at the end when the PayFast account has one.
export function payfastSignature(fields: [string, string][], passphrase?: string | null) {
  const parts = fields
    .filter(([, value]) => value.trim() !== "")
    .map(([name, value]) => `${name}=${payfastEncode(value.trim())}`);
  const secret = passphrase?.trim();
  if (secret) parts.push(`passphrase=${payfastEncode(secret)}`);
  return createHash("md5").update(parts.join("&")).digest("hex");
}

export type PayfastCheckoutInput = {
  merchantId: string;
  merchantKey: string;
  passphrase?: string | null;
  sandbox: boolean;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  paymentId: string; // our payment_attempts.id, returned to us by PayFast as m_payment_id
  amountCents: number;
  itemName: string;
  itemDescription: string;
};

// The field ORDER matters: PayFast recreates the signature in the order the fields appear in the form.
export function buildPayfastCheckout(input: PayfastCheckoutInput) {
  const one = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);
  const fields: [string, string][] = [
    ["merchant_id", input.merchantId.trim()],
    ["merchant_key", input.merchantKey.trim()],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["m_payment_id", input.paymentId],
    ["amount", formatPayfastAmount(input.amountCents)],
    ["item_name", one(input.itemName, 100)],
    ["item_description", one(input.itemDescription, 255)],
  ];
  const sent = fields.filter(([, value]) => value.trim() !== "");
  const signature = payfastSignature(sent, input.passphrase);
  return {
    action: input.sandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL,
    fields: [...sent, ["signature", signature]] as [string, string][],
  };
}


// ============ PAYMENT NOTIFICATIONS (ITN) ============
// PayFast calls our server after a payment. These helpers check that the call is genuine.

// For notifications, PayFast signs ALL fields exactly as received (blank ones included), in the order received.
export function itnParamString(entries: [string, string][]) {
  return entries
    .filter(([name]) => name !== "signature")
    .map(([name, value]) => `${name}=${payfastEncode(value)}`)
    .join("&");
}

export function itnSignature(entries: [string, string][], passphrase?: string | null) {
  const base = itnParamString(entries);
  const secret = passphrase?.trim();
  return createHash("md5").update(secret ? `${base}&passphrase=${payfastEncode(secret)}` : base).digest("hex");
}

export function signaturesMatch(received: string, expected: string) {
  const a = Buffer.from(received.trim().toLowerCase());
  const b = Buffer.from(expected.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// "123.45" -> 12345. Returns null for anything that is not a plain amount.
export function amountToCents(value: string | null | undefined) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec((value ?? "").trim());
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0") || "0");
  return match[1] ? -cents : cents;
}

// PayFast only calls from its own servers. Look up their addresses (cached for an hour) and compare.
const PAYFAST_HOSTS = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];
let ipCache: { ips: Set<string>; expires: number } | null = null;

async function payfastIps() {
  if (ipCache && ipCache.expires > Date.now()) return ipCache.ips;
  const results = await Promise.allSettled(PAYFAST_HOSTS.map((host) => dns.resolve4(host)));
  const ips = new Set<string>();
  for (const result of results) if (result.status === "fulfilled") result.value.forEach((ip) => ips.add(ip));
  if (ips.size) ipCache = { ips, expires: Date.now() + 60 * 60 * 1000 };
  return ips;
}

// "yes" and "no" are definite. "unknown" means we could not look PayFast's addresses up right now, so the
// other checks (signature and PayFast's own confirmation) have to carry the decision.
export async function checkPayfastIp(rawIp: string | null): Promise<"yes" | "no" | "unknown"> {
  const ips = await payfastIps();
  if (!ips.size) return "unknown";
  const ip = (rawIp ?? "").replace(/^::ffff:/, "").trim();
  return ips.has(ip) ? "yes" : "no";
}

// Asks PayFast directly whether it really sent this notification. Returns true only for a clear "VALID".
export async function confirmWithPayfast(entries: [string, string][], sandbox: boolean) {
  const host = sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";
  try {
    const response = await fetch(`https://${host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: itnParamString(entries),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok && (await response.text()).trim() === "VALID";
  } catch (error) {
    console.error("[payfast] confirmation request failed:", error);
    return false;
  }
}
