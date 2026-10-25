import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { nextMonth } from "@/lib/recurring";

const MAX_PER_RUN = 100;

// For every invoice set to repeat today, makes a fresh DRAFT copy and emails the owner a link to review and send it.
// Nothing is ever sent to a client without the owner's tap. Called by the daily reminders job.
export async function runRecurring(): Promise<{ due: number; created: number; failed: number }> {
  const admin = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const { data: due, error } = await admin
    .from("recurring_invoices")
    .select("id,business_id,source_document_id,day_of_month,next_run")
    .eq("active", true)
    .lte("next_run", today)
    .limit(MAX_PER_RUN);
  if (error) { console.error("[recurring] could not load:", error.message); return { due: 0, created: 0, failed: 1 }; }

  const result = { due: due?.length ?? 0, created: 0, failed: 0 };
  for (const r of due ?? []) {
    // Claim this run first. If two runs overlap, only one of them moves next_run and carries on.
    const upcoming = nextMonth(today, r.day_of_month);
    const { data: claimed } = await admin.from("recurring_invoices").update({ next_run: upcoming }).eq("id", r.id).eq("next_run", r.next_run).select("id");
    if (!claimed?.length) continue;
    try {
      const { data: src } = await admin.from("documents").select("*").eq("id", r.source_document_id).maybeSingle();
      if (!src || src.type !== "invoice") { await admin.from("recurring_invoices").update({ active: false }).eq("id", r.id); continue; }
      const [{ data: biz }, { data: lines }, { data: client }] = await Promise.all([
        admin.from("businesses").select("id,name,email,brand_color,vat_registered,owner_id").eq("id", r.business_id).maybeSingle(),
        admin.from("document_lines").select("description,quantity,unit_price_cents,line_total_cents,sort_order").eq("document_id", src.id).order("sort_order"),
        admin.from("clients").select("name").eq("id", src.client_id).maybeSingle(),
      ]);
      if (!biz) throw new Error("business missing");
      const { data: n, error: nErr } = await admin.rpc("next_document_number_system", { p_business: biz.id, p_type: "invoice" });
      if (nErr || !n?.[0]) throw new Error(`numbering failed: ${nErr?.message}`);

      const subtotal = (lines ?? []).reduce((a, l) => a + Number(l.line_total_cents), 0);
      const vatPercent = biz.vat_registered ? 15 : 0;
      const vat = Math.round((subtotal * vatPercent) / 100);
      const m = String(src.payment_terms ?? "").match(/\d+/);
      const termDays = m ? parseInt(m[0], 10) : 0;
      const due_date = new Date(Date.parse(`${today}T00:00:00Z`) + termDays * 86_400_000).toISOString().slice(0, 10);

      const { data: copy, error: copyError } = await admin.from("documents").insert({
        business_id: src.business_id, client_id: src.client_id, type: "invoice", seq: n[0].doc_seq, number: n[0].doc_number, status: "draft",
        title: src.title, description: src.description, location: src.location, job_date: null, job_date_tbd: src.job_date_tbd, labour_only: src.labour_only,
        issue_date: today, due_date, vat_percent: vatPercent, subtotal_cents: subtotal, vat_cents: vat, total_cents: subtotal + vat,
        payment_plan: src.payment_plan, deposit_percent: src.deposit_percent, payment_terms: src.payment_terms, note: src.note,
      }).select("id,number,total_cents").single();
      if (copyError || !copy) throw new Error(`copy failed: ${copyError?.message}`);
      const { error: linesError } = await admin.from("document_lines").insert((lines ?? []).map((l) => ({ ...l, document_id: copy.id })));
      if (linesError) { await admin.from("documents").delete().eq("id", copy.id).eq("status", "draft"); throw new Error(`lines failed: ${linesError.message}`); }
      await admin.from("recurring_invoices").update({ last_document_id: copy.id }).eq("id", r.id);
      result.created++;

      let to: string | null = isEmail(biz.email) ? biz.email.trim() : null;
      if (!to && biz.owner_id) {
        const { data: owner } = await admin.auth.admin.getUserById(biz.owner_id);
        to = isEmail(owner?.user?.email) ? owner.user.email.trim() : null;
      }
      if (to) try {
        await sendEmail({
          to,
          fromName: "Yebo Invoices",
          idempotencyKey: `recurring/${r.id}/${today}`,
          subject: `Your monthly invoice for ${client?.name ?? "your client"} is ready to send`,
          html: renderEmail({
            brandColor: biz.brand_color,
            heading: "Your monthly invoice is ready",
            intro: `Yebo made invoice ${copy.number} for ${client?.name ?? "your client"} from your repeating invoice. It is a draft, so nothing has been sent yet. Check it and send it when you are ready.`,
            rows: [["Client", client?.name ?? "-"], ["Invoice", copy.number], ["Total", formatRand(Number(copy.total_cents))], ["Due", formatDate(due_date)], ["Next one on", formatDate(upcoming)]],
            buttonLabel: "Review and send",
            buttonUrl: `${appUrl()}/app/documents/${copy.id}`,
            footer: "To stop these, open the original invoice and tap \"Stop repeating\".",
          }),
        });
      } catch (e) { console.error("[recurring] could not email the owner:", e); }
    } catch (e) {
      result.failed++;
      console.error("[recurring] run failed:", r.id, e);
      // Put the run back so tomorrow's job tries again.
      await admin.from("recurring_invoices").update({ next_run: r.next_run }).eq("id", r.id);
    }
  }
  return result;
}
