import { createHmac, timingSafeEqual } from "node:crypto";
import { PLAN_ORDER, type PlanId } from "@/lib/plans";

// Yebo's OWN Paystack account: it receives subscription fees. (Each business's client payments are separate and stay on its own PayFast.)
// Environment: PAYSTACK_SECRET_KEY, and one Paystack plan code per plan: PAYSTACK_PLAN_SIDE, PAYSTACK_PLAN_REAL, PAYSTACK_PLAN_KING.
// Use the TEST key with the TEST plan codes first, then swap all four to live.
const API = "https://api.paystack.co";

export type PaystackConfig = { secret: string; plans: Record<PlanId, string>; test: boolean };

export function paystackConfig(): PaystackConfig | null {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  const side = process.env.PAYSTACK_PLAN_SIDE?.trim();
  const real = process.env.PAYSTACK_PLAN_REAL?.trim();
  const king = process.env.PAYSTACK_PLAN_KING?.trim();
  if (!secret || !side || !real || !king) return null;
  return { secret, plans: { side, real, king }, test: secret.startsWith("sk_test_") };
}

export function planIdFromCode(cfg: PaystackConfig, code: string | null | undefined): PlanId | null {
  if (!code) return null;
  return PLAN_ORDER.find((id) => cfg.plans[id] === code) ?? null;
}

async function call<T>(cfg: PaystackConfig, path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetch(API + path, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { status?: boolean; data?: T; message?: string } | null;
    if (!res.ok || !json?.status) {
      console.error(`[paystack] ${path} failed:`, res.status, json?.message ?? "");
      return { ok: false, data: null };
    }
    return { ok: true, data: (json.data ?? null) as T | null };
  } catch (error) {
    console.error(`[paystack] ${path} request failed:`, error);
    return { ok: false, data: null };
  }
}

// The webhook proves it came from Paystack with an HMAC-SHA512 of the raw body, made with your secret key.
export function signatureOk(cfg: PaystackConfig, raw: string, header: string | null): boolean {
  if (!header) return false;
  const expected = createHmac("sha512", cfg.secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Starts a subscription payment. Paystack takes the first payment now and then charges the plan every month.
export async function initializePaystack(cfg: PaystackConfig, o: { email: string; planCode: string; amountCents: number; reference: string; callbackUrl: string; metadata: Record<string, unknown> }): Promise<string | null> {
  const r = await call<{ authorization_url?: string }>(cfg, "/transaction/initialize", {
    method: "POST",
    body: { email: o.email, amount: o.amountCents, currency: "ZAR", plan: o.planCode, reference: o.reference, callback_url: o.callbackUrl, metadata: o.metadata },
  });
  return r.data?.authorization_url ?? null;
}

export type PaystackTx = {
  reference: string; status: string; amountCents: number; planCode: string | null;
  customerCode: string | null; customerEmail: string | null; metadata: Record<string, unknown>;
};

// Asks Paystack itself whether a payment really happened. We never trust the browser or the webhook body for the amount or the plan.
export async function verifyPaystack(cfg: PaystackConfig, reference: string): Promise<PaystackTx | null> {
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) return null;
  const r = await call<Record<string, unknown>>(cfg, `/transaction/verify/${encodeURIComponent(reference)}`);
  const d = r.data;
  if (!d) return null;
  const plan = d.plan as string | { plan_code?: string } | null | undefined;
  const customer = (d.customer ?? {}) as { customer_code?: string; email?: string };
  const metadata = typeof d.metadata === "object" && d.metadata ? (d.metadata as Record<string, unknown>) : {};
  return {
    reference: String(d.reference ?? reference),
    status: String(d.status ?? ""),
    amountCents: Number(d.amount ?? 0),
    planCode: typeof plan === "string" ? plan : plan?.plan_code ?? null,
    customerCode: customer.customer_code ?? null,
    customerEmail: customer.email ?? null,
    metadata,
  };
}

export async function disablePaystackSubscription(cfg: PaystackConfig, code: string, token: string): Promise<boolean> {
  const r = await call<unknown>(cfg, "/subscription/disable", { method: "POST", body: { code, token } });
  return r.ok;
}

// When we missed the subscription code, find the customer's active subscription in Paystack.
export async function findPaystackSubscription(cfg: PaystackConfig, customerCode: string): Promise<{ code: string; token: string } | null> {
  const r = await call<{ subscription_code?: string; email_token?: string; status?: string; customer?: { customer_code?: string } }[]>(cfg, "/subscription?perPage=100");
  const hit = (r.data ?? []).find((s) => s.customer?.customer_code === customerCode && s.status === "active" && s.subscription_code && s.email_token);
  return hit ? { code: hit.subscription_code as string, token: hit.email_token as string } : null;
}
