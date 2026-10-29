import { createHmac, timingSafeEqual } from "node:crypto";

// A signed link, so only the owner of the email can unsubscribe it. Needs a server secret that already exists.
const secret = () => process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function unsubToken(email: string): string {
  return createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function validUnsub(email: string, token: string): boolean {
  if (!secret() || !email || !token) return false;
  const a = Buffer.from(unsubToken(email));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
