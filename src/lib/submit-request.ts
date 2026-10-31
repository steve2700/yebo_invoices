import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail, sendEmail, isEmail } from "@/lib/email";
import { cleanRequest } from "@/lib/requests";
import { cleanPreferredDate, cleanSource, sourceLabel } from "@/lib/request-sources";
import { sniffImage } from "@/lib/sniff";
import { southAfricaDate } from "@/lib/time";
import { appUrl } from "@/lib/url";

export const MAX_REQUEST_PHOTOS = 3;
const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;
export const REQUEST_BUCKET = "request-photos";

export type SubmitResult = { ok: boolean; error?: string };

// Called by anyone who opens a business's request link, so it is strict: checked input, a hidden trap field for bots,
// photos checked by their real bytes, and a cap on how many requests one business can receive per hour.
export async function submitRequest(token: string, form: FormData): Promise<SubmitResult> {
  const uploaded: string[] = [];
  const admin = createAdminClient();
  try {
    if (typeof token !== "string" || !/^[a-z0-9]{8,32}$/.test(token)) return { ok: false, error: "This link is not valid." };
    if (String(form.get("website") ?? "").trim()) return { ok: true }; // a bot filled the hidden field: pretend it worked
    const cleaned = cleanRequest({
      name: form.get("name"), whatsapp: form.get("whatsapp"), email: form.get("email"), location: form.get("location"), details: form.get("details"),
    });
    if (!cleaned.ok) return { ok: false, error: cleaned.error };
    const v = cleaned.value;
    const source = cleanSource(form.get("source"));
    const preferred = cleanPreferredDate(form.get("preferred_date"), southAfricaDate());

    const { data: business } = await admin.from("businesses").select("id,name,email,owner_id").eq("request_token", token).maybeSingle();
    if (!business) return { ok: false, error: "This link is not valid." };

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("quote_requests").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", hourAgo);
    if ((count ?? 0) >= 15) return { ok: false, error: "This business is getting a lot of requests right now. Please message them on WhatsApp instead." };

    // The same person sending the same words twice in 10 minutes is one request.
    const tenAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: dup } = await admin.from("quote_requests").select("id").eq("business_id", business.id).eq("name", v.name).eq("details", v.details).gte("created_at", tenAgo).limit(1);
    if (dup?.length) return { ok: true };

    const id = crypto.randomUUID();
    const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0).slice(0, MAX_REQUEST_PHOTOS);
    let n = 0;
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kind = sniffImage(bytes);
      if (!kind) continue;
      const path = `${business.id}/${id}/${n}.${kind.ext}`;
      const { error } = await admin.storage.from(REQUEST_BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false });
      if (error) { console.error("[request] photo upload failed:", error.message); continue; }
      uploaded.push(path);
      n++;
    }

    const { error } = await admin.from("quote_requests").insert({
      id, business_id: business.id, name: v.name, whatsapp: v.whatsapp || null, email: v.email || null,
      location: v.location || null, details: v.details, source: source || null, preferred_date: preferred || null, photos: uploaded,
    });
    if (error) {
      if (uploaded.length) await admin.storage.from(REQUEST_BUCKET).remove(uploaded);
      console.error("[request] insert failed:", error.message);
      return { ok: false, error: "Something went wrong. Please try again in a minute." };
    }

    // Tell the owner. The email never blocks the request: if it fails, the request is still in their dashboard.
    let to = isEmail(business.email) ? business.email.trim() : "";
    if (!to) {
      const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
      to = owner?.user?.email ?? "";
    }
    if (to) {
      const rows: [string, string][] = [["Name", v.name], ["WhatsApp", v.whatsapp || "-"], ["Email", v.email || "-"], ["Where", v.location || "-"]];
      if (preferred) rows.push(["Wants it done", preferred]);
      if (uploaded.length) rows.push(["Photos", String(uploaded.length)]);
      rows.push(["Came from", sourceLabel(source)]);
      await sendEmail({
        to, fromName: "Yebo Invoices", replyTo: v.email || null, idempotencyKey: `quote-request/${id}`,
        subject: `New quote request from ${v.name}`,
        html: renderEmail({
          heading: `${v.name} wants a quote`, intro: v.details.slice(0, 600), rows,
          buttonLabel: "Open the request", buttonUrl: `${appUrl()}/app/requests`,
          footer: "Reply fast: the first clear quote usually wins the job.",
        }),
      });
    }
    return { ok: true };
  } catch (caught) {
    if (uploaded.length) await admin.storage.from(REQUEST_BUCKET).remove(uploaded).catch(() => {});
    console.error("[request] failed:", caught);
    return { ok: false, error: "Something went wrong. Please try again in a minute." };
  }
}
