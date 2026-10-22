"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TENDER_BUCKET, UUID_RE, tenderAccess } from "@/lib/tender-access";
import { loadTenderLines, loadVault } from "@/lib/tender-data";
import {
  TENDER_CATEGORIES, closingInfo, isCompliant, lockMessage, summarise, tenderTotals, vaultChecks, formatQty, randWithCents,
  type TenderLine,
} from "@/lib/tenders";
import { buildBidPdf, mergePacket, type PacketFile } from "@/lib/tender-pdf";
import { buildPricedBoqXlsx } from "@/lib/tender-xlsx";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";
import { southAfricaDate, formatSouthAfricaDateTime } from "@/lib/time";
import { appUrl } from "@/lib/url";

type Sb = Awaited<ReturnType<typeof createClient>>;
type Result = { ok: true } | { ok: false; error: string };

async function context(): Promise<
  | { ok: true; sb: Sb; userId: string; businessId: string }
  | { ok: false; error: string }
> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const access = await tenderAccess(sb);
  if (!access.allowed) return { ok: false, error: "The Tender Engine is part of The Industry King plan. You can upgrade in Settings." };
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) return { ok: false, error: "Finish setting up your business first." };
  return { ok: true, sb, userId: user.id, businessId: business.id };
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const orNull = (s: string) => (s ? s : null);

export type TenderDetails = {
  title: string;
  reference: string;
  clientName: string;
  category: string;
  location: string;
  closingAt: string; // ISO from the browser, or ""
  submissionEmail: string;
  notes: string;
};

function cleanDetails(d: TenderDetails) {
  const closing = d.closingAt ? new Date(d.closingAt) : null;
  const email = clip(d.submissionEmail, 200).toLowerCase();
  return {
    title: clip(d.title, 200),
    reference: orNull(clip(d.reference, 80)),
    client_name: orNull(clip(d.clientName, 160)),
    category: (TENDER_CATEGORIES as readonly string[]).includes(d.category) ? d.category : orNull(clip(d.category, 60)),
    location: orNull(clip(d.location, 160)),
    closing_at: closing && !Number.isNaN(closing.getTime()) ? closing.toISOString() : null,
    submission_email: orNull(email),
    notes: orNull(clip(d.notes, 2000)),
    emailBad: Boolean(email) && !isEmail(email),
  };
}

export async function createTender(details: TenderDetails): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const c = cleanDetails(details);
  if (!c.title) return { ok: false, error: "Give the tender a name first." };
  if (c.emailBad) return { ok: false, error: "That submission email address does not look right." };
  const { data: business } = await ctx.sb.from("businesses").select("vat_registered").eq("id", ctx.businessId).maybeSingle();
  const { emailBad, ...fields } = c;
  void emailBad;
  const { data, error } = await ctx.sb
    .from("tenders")
    .insert({ ...fields, business_id: ctx.businessId, vat_percent: business?.vat_registered ? 15 : 0 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "We could not create the tender. Please try again." };
  revalidatePath("/app/tenders");
  return { ok: true, id: data.id };
}

export type LineInput = {
  id: string;
  kind: "heading" | "item";
  itemNo: string;
  description: string;
  unit: string;
  quantity: number | null;
  rateCents: number | null;
  estRateCents: number | null;
  raw: string;
  aiUnsure: boolean;
};

const MAX_LINES = 5000;

// Saves the details and every line in one go, and works the totals out again on the server.
export async function saveTender(id: string, details: TenderDetails, lines: LineInput[]): Promise<{ ok: true; savedAt: string; subtotalCents: number; vatCents: number; totalCents: number; status: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(id)) return { ok: false, error: "We could not find that tender." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const c = cleanDetails(details);
  if (!c.title) return { ok: false, error: "The tender needs a name." };
  if (c.emailBad) return { ok: false, error: "That submission email address does not look right." };
  if (!Array.isArray(lines) || lines.length > MAX_LINES) return { ok: false, error: `A tender can have up to ${MAX_LINES} lines.` };

  const { data: tender } = await ctx.sb.from("tenders").select("id,vat_percent,status").eq("id", id).maybeSingle();
  if (!tender) return { ok: false, error: "We could not find that tender." };

  const clean: TenderLine[] = lines.map((l) => ({
    id: UUID_RE.test(l.id) ? l.id : crypto.randomUUID(),
    kind: l.kind === "heading" ? "heading" : "item",
    itemNo: clip(l.itemNo, 20),
    description: clip(l.description, 2000),
    unit: clip(l.unit, 20),
    quantity: l.kind === "heading" || l.quantity == null || !Number.isFinite(l.quantity) || l.quantity < 0 ? null : Math.round(l.quantity * 100000) / 100000,
    rateCents: l.kind === "heading" || l.rateCents == null || !Number.isFinite(l.rateCents) || l.rateCents < 0 ? null : Math.round(l.rateCents),
    estRateCents: l.estRateCents == null || !Number.isFinite(l.estRateCents) || l.estRateCents < 0 ? null : Math.round(l.estRateCents),
    raw: clip(l.raw, 1500),
    aiUnsure: Boolean(l.aiUnsure),
  }));
  const dupe = new Set<string>();
  for (const l of clean) { if (dupe.has(l.id)) l.id = crypto.randomUUID(); dupe.add(l.id); }

  // 1) write the new and changed lines first, 2) then remove the lines that were deleted, so a failure never loses work.
  for (let i = 0; i < clean.length; i += 400) {
    const rows = clean.slice(i, i + 400).map((l, j) => ({
      id: l.id,
      tender_id: id,
      sort_order: i + j,
      kind: l.kind,
      item_no: orNull(l.itemNo),
      description: l.description,
      unit: orNull(l.unit),
      quantity: l.quantity,
      rate_cents: l.rateCents,
      est_rate_cents: l.estRateCents,
      raw: orNull(l.raw),
      ai_unsure: l.aiUnsure,
    }));
    const { error } = await ctx.sb.from("tender_lines").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("[tenders/save] lines failed:", error.message);
      return { ok: false, error: "We could not save your lines. Nothing was lost, please try again." };
    }
  }
  const keep = new Set(clean.map((l) => l.id));
  const existing = await loadTenderLines(ctx.sb, id);
  const gone = existing.filter((l) => !keep.has(l.id)).map((l) => l.id);
  for (let i = 0; i < gone.length; i += 200) {
    await ctx.sb.from("tender_lines").delete().eq("tender_id", id).in("id", gone.slice(i, i + 200));
  }

  const totals = tenderTotals(clean, Number(tender.vat_percent));
  const summary = summarise(clean);
  const status = tender.status === "draft" || tender.status === "ready" ? (summary.itemCount > 0 && summary.unpricedCount === 0 ? "ready" : "draft") : tender.status;
  const { emailBad, ...fields } = c;
  void emailBad;
  const savedAt = new Date().toISOString();
  const { error } = await ctx.sb.from("tenders").update({
    ...fields,
    subtotal_cents: totals.subtotalCents,
    vat_cents: totals.vatCents,
    total_cents: totals.totalCents,
    status,
    updated_at: savedAt,
  }).eq("id", id);
  if (error) return { ok: false, error: "We could not save the tender details. Please try again." };
  revalidatePath("/app/tenders");
  return { ok: true, savedAt, ...totals, status };
}

export async function deleteTender(id: string): Promise<Result> {
  if (!UUID_RE.test(id)) return { ok: false, error: "We could not find that tender." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.sb.from("tenders").delete().eq("id", id);
  if (error) return { ok: false, error: "We could not delete that tender." };
  revalidatePath("/app/tenders");
  redirect("/app/tenders");
}

export async function setTenderOutcome(id: string, outcome: "won" | "lost" | "ready"): Promise<Result> {
  if (!UUID_RE.test(id) || !["won", "lost", "ready"].includes(outcome)) return { ok: false, error: "That did not work." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.sb.from("tenders").update({ status: outcome, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "We could not update that tender." };
  revalidatePath(`/app/tenders/${id}`);
  revalidatePath("/app/tenders");
  return { ok: true };
}

// ---------------- compliance vault ----------------

export type VaultInput = {
  csdNumber: string;
  csdPath: string | null;
  sarsPin: string;
  sarsExpiry: string;
  sarsPath: string | null;
  bbbeeLevel: number | null;
  bbbeeExpiry: string;
  bbbeePath: string | null;
  coidaExpiry: string;
  coidaPath: string | null;
};

const isoDate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null);

export async function saveVault(input: VaultInput): Promise<Result> {
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const own = `${ctx.userId}/compliance/`;
  const path = (p: string | null) => (typeof p === "string" && p.startsWith(own) && !p.includes("..") ? p : null);
  const csd = clip(input.csdNumber, 20).toUpperCase().replace(/\s+/g, "");
  const level = input.bbbeeLevel != null && Number.isInteger(input.bbbeeLevel) && input.bbbeeLevel >= 1 && input.bbbeeLevel <= 9 ? input.bbbeeLevel : null;
  const { error } = await ctx.sb.from("compliance_vault").upsert({
    business_id: ctx.businessId,
    csd_number: orNull(csd),
    csd_path: path(input.csdPath),
    sars_pin: orNull(clip(input.sarsPin, 40).toUpperCase()),
    sars_expiry: isoDate(input.sarsExpiry),
    sars_path: path(input.sarsPath),
    bbbee_level: level,
    bbbee_expiry: isoDate(input.bbbeeExpiry),
    bbbee_path: path(input.bbbeePath),
    coida_expiry: isoDate(input.coidaExpiry),
    coida_path: path(input.coidaPath),
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id" });
  if (error) {
    console.error("[tenders/vault] save failed:", error.message);
    return { ok: false, error: "We could not save your vault. Please try again." };
  }
  revalidatePath("/app/tenders", "layout");
  return { ok: true };
}

// ---------------- sending the bid ----------------

const MAX_ATTACH_BYTES = 25 * 1024 * 1024; // Resend allows 40 MB after encoding

export type SubmitResult = { ok: true; to: string; test: boolean; at: string; sizeKb: number; skipped: string[] } | { ok: false; error: string };

// Builds the packet (priced schedule + compliance documents merged into one PDF, plus the priced Excel BOQ)
// and emails it. With testOnly, it goes to the business's own email and the tender is not marked as submitted.
export async function submitTender(id: string, testOnly = false): Promise<SubmitResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "We could not find that tender." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const { sb } = ctx;

  const { data: tender } = await sb.from("tenders").select("id,reference,title,client_name,closing_at,submission_email,vat_percent,status").eq("id", id).maybeSingle();
  if (!tender) return { ok: false, error: "We could not find that tender." };
  const { data: business } = await sb
    .from("businesses")
    .select("name,email,phone,address,brand_color,company_reg,vat_registered,vat_number")
    .eq("id", ctx.businessId)
    .maybeSingle();
  if (!business) return { ok: false, error: "We could not find your business details." };
  if (!isEmail(business.email)) return { ok: false, error: "Add your business email in Settings first. Replies from the client go to it." };
  const ownEmail = business.email.trim();

  if (!testOnly) {
    if (tender.status === "submitted") return { ok: false, error: "This bid was already submitted. Use the test option if you only want a copy." };
    if (!isEmail(tender.submission_email)) return { ok: false, error: "Add the email address this tender must be submitted to." };
    if (tender.closing_at && closingInfo(tender.closing_at).tone === "closed") return { ok: false, error: "This tender has already closed." };
  }

  const lines = await loadTenderLines(sb, id);
  const summary = summarise(lines);
  if (!summary.itemCount) return { ok: false, error: "There are no BOQ lines yet. Import the BOQ first." };
  if (!testOnly && summary.unpricedCount > 0) {
    return { ok: false, error: `${summary.unpricedCount} line${summary.unpricedCount === 1 ? " is" : "s are"} still not priced. Price every line, or delete the ones you are not bidding for.` };
  }

  const vault = await loadVault(sb, ctx.businessId);
  const checks = vaultChecks(vault, southAfricaDate(), tender.closing_at ? southAfricaDate(tender.closing_at) : null);
  if (!testOnly && !isCompliant(checks)) return { ok: false, error: lockMessage(checks) ?? "Your compliance documents need attention." };

  // Fetch the compliance files from private storage.
  const files: PacketFile[] = [];
  const wanted: [string, string | null | undefined][] = [
    ["CSD summary", vault?.csd_path],
    ["SARS tax compliance", vault?.sars_path],
    ["B-BBEE affidavit", vault?.bbbee_path],
    ["COIDA letter of good standing", vault?.coida_path],
  ];
  for (const [label, path] of wanted) {
    if (!path || !path.startsWith(`${ctx.userId}/`)) continue;
    const { data: blob } = await sb.storage.from(TENDER_BUCKET).download(path);
    if (!blob) {
      if (!testOnly) return { ok: false, error: `We could not open your ${label} file. Upload it again in the vault.` };
      continue;
    }
    const ext = path.split(".").pop() ?? "pdf";
    files.push({ name: `${label}.${ext}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }

  try {
    const totals = tenderTotals(lines, Number(tender.vat_percent));
    const bid = await buildBidPdf({
      business: { ...business, vat_registered: Boolean(business.vat_registered) },
      tender: { reference: tender.reference, title: tender.title, client_name: tender.client_name, closing_at: tender.closing_at, vat_percent: Number(tender.vat_percent) },
      lines,
      totals,
      csdNumber: vault?.csd_number ?? null,
      today: southAfricaDate(),
    });
    const packet = await mergePacket(bid, files);
    const xlsx = await buildPricedBoqXlsx({
      businessName: business.name,
      tender: { reference: tender.reference, title: tender.title, client_name: tender.client_name, vat_percent: Number(tender.vat_percent) },
      lines,
    });
    if (packet.bytes.length + xlsx.length > MAX_ATTACH_BYTES) {
      return { ok: false, error: "The bid packet is over 25 MB, which is too big to email. Compress your compliance PDFs in the vault and try again." };
    }

    const safe = (tender.reference || tender.title).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 50) || "bid";
    const to = testOnly ? ownEmail : (tender.submission_email as string).trim();
    const subject = `${testOnly ? "[TEST] " : ""}Tender submission${tender.reference ? ` ${tender.reference}` : ""}: ${tender.title} - ${business.name}`;
    const sent = await sendEmail({
      to,
      fromName: business.name,
      replyTo: ownEmail,
      idempotencyKey: `tender-submit/${id}/${testOnly ? "test" : "send"}/${Math.floor(Date.now() / 60_000)}`,
      subject,
      html: renderEmail({
        brandColor: business.brand_color,
        heading: testOnly ? "Test copy of your bid packet" : "Tender submission",
        intro: testOnly
          ? "This is a test copy sent only to you. Nothing has been sent to the client and the tender is not marked as submitted."
          : `${business.name} submits its priced bid for ${tender.title}${tender.reference ? ` (${tender.reference})` : ""}. The bid packet (priced schedule with compliance documents) and the priced BOQ in Excel are attached.`,
        rows: [
          ["Tender", tender.title],
          ...(tender.reference ? ([["Reference", tender.reference]] as [string, string][]) : []),
          ["Total excl. VAT", randWithCents(totals.subtotalCents)],
          [Number(tender.vat_percent) > 0 ? `VAT ${tender.vat_percent}%` : "VAT", randWithCents(totals.vatCents)],
          ["Total incl. VAT", randWithCents(totals.totalCents)],
          ["Line items", formatQty(summary.itemCount)],
        ],
        note: packet.skipped.length ? `These files could not be merged into the PDF and are not included: ${packet.skipped.join(", ")}.` : null,
        buttonLabel: "Reply to this email",
        buttonUrl: `mailto:${ownEmail}`,
        footer: `Contact: ${[business.phone, ownEmail].filter(Boolean).join(" | ")}`,
      }),
      attachments: [
        { filename: `bid-packet-${safe}.pdf`, content: Buffer.from(packet.bytes).toString("base64") },
        { filename: `priced-boq-${safe}.xlsx`, content: Buffer.from(xlsx).toString("base64") },
      ],
    });
    if (!sent) return { ok: false, error: "The email did not go through, so nothing was sent. Please try again in a moment." };

    const at = new Date().toISOString();
    if (!testOnly) {
      await sb.from("tenders").update({ status: "submitted", submitted_at: at, submitted_to: to, updated_at: at }).eq("id", id);
      // A copy for the owner's own records (no attachments, to keep it light).
      await sendEmail({
        to: ownEmail,
        fromName: "Yebo Invoices",
        idempotencyKey: `tender-copy/${id}/${Math.floor(Date.now() / 60_000)}`,
        subject: `Bid sent: ${tender.title}`,
        html: renderEmail({
          brandColor: business.brand_color,
          heading: "Your bid was sent",
          intro: `Your bid for ${tender.title} was emailed to ${to} on ${formatSouthAfricaDateTime(at)}.`,
          rows: [["Total incl. VAT", randWithCents(totals.totalCents)]],
          buttonLabel: "Open the tender",
          buttonUrl: `${appUrl()}/app/tenders/${id}`,
        }),
      });
    }
    revalidatePath(`/app/tenders/${id}`);
    revalidatePath("/app/tenders");
    return { ok: true, to, test: testOnly, at, sizeKb: Math.round((packet.bytes.length + xlsx.length) / 1024), skipped: packet.skipped };
  } catch (error) {
    console.error("[tenders/submit] failed:", error);
    return { ok: false, error: "We could not build the bid packet. Check that your compliance files are valid PDFs or photos, then try again." };
  }
}
