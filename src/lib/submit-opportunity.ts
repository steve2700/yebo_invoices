import { createAdminClient } from "@/lib/supabase/admin";
import { submitRequest, type SubmitResult } from "@/lib/submit-request";
import { cleanRequest } from "@/lib/requests";
import { pageBySlug } from "@/lib/opportunities";
import { loadPros } from "@/lib/opp-pros";

// A homeowner on a public /jobs page asks for quotes. The job is sent, as a normal quote request, to up to 3 businesses that
// opted in for this trade and area: the top 3 by the open ranking in opp-rank.ts. Each owner gets the usual email and one-tap quote.
export async function submitOpportunity(slug: string, form: FormData): Promise<SubmitResult & { matched?: number }> {
  const page = pageBySlug(slug);
  if (!page) return { ok: false, error: "This page is not valid." };
  if (String(form.get("website") ?? "").trim()) return { ok: true, matched: 0 }; // a bot filled the hidden field
  const check = cleanRequest({ name: form.get("name"), whatsapp: form.get("whatsapp"), email: form.get("email"), location: form.get("location"), details: form.get("details") });
  if (!check.ok) return { ok: false, error: check.error };
  if (!check.value.whatsapp && !check.value.email) return { ok: false, error: "Please add a WhatsApp number or an email so the carpenters can reach you." };

  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("opportunity_jobs").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  if ((count ?? 0) >= 40) return { ok: false, error: "We are getting a lot of requests right now. Please try again in a little while." };

  const found = (await loadPros(page.trade, page.area, 3)).map((x) => ({ id: x.id, request_token: x.token }));
  if (!found?.length) return { ok: false, error: `We do not have a carpenter signed up for ${page.areaName} yet, so nothing was sent. Please try again soon.` };

  form.set("source", `yebo-${page.tag}`.slice(0, 30));
  const sent: string[] = [];
  for (const b of found) {
    if (!b.request_token) continue;
    const res = await submitRequest(b.request_token, form);
    if (res.ok) sent.push(b.id);
  }
  if (!sent.length) return { ok: false, error: "The carpenters nearby are busy right now. Please try again in a little while." };

  await admin.from("opportunity_jobs").insert({ page: page.slug, trade: page.trade, area: page.area, matched: sent.length });
  await admin.from("businesses").update({ opp_last_at: new Date().toISOString() }).in("id", sent);
  return { ok: true, matched: sent.length };
}
