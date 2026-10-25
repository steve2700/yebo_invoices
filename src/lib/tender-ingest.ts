import type { createClient } from "@/lib/supabase/server";
import { chunkText, type ParsedLine } from "@/lib/boq-grid";
import { mergeInfo, parseInfo, type TenderInfo } from "@/lib/tender-docs";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export const MAX_LINES = 5000;

// Stores what was read from the documents. Fills empty details only: whatever the owner already typed is kept.
export async function saveInfo(sb: Supabase, id: string, next: TenderInfo): Promise<TenderInfo> {
  const { data: t } = await sb.from("tenders").select("submission_email,closing_at,reference,submission_info").eq("id", id).maybeSingle();
  const merged = mergeInfo(parseInfo(t?.submission_info), next);
  const patch: Record<string, unknown> = { submission_info: merged, updated_at: new Date().toISOString() };
  if (!t?.submission_email && merged.submitEmail) patch.submission_email = merged.submitEmail;
  if (!t?.closing_at && merged.closingAt) patch.closing_at = merged.closingAt;
  if (!t?.reference && merged.rfqNumber) patch.reference = merged.rfqNumber.slice(0, 80);
  await sb.from("tenders").update(patch).eq("id", id);
  return merged;
}

export async function clearOld(sb: Supabase, id: string, mode: "replace" | "append") {
  if (mode === "replace") await sb.from("tender_lines").delete().eq("tender_id", id);
  await sb.from("tender_sources").delete().eq("tender_id", id);
}

export async function nextOrder(sb: Supabase, id: string, mode: "replace" | "append") {
  if (mode !== "append") return 0;
  const { data: last } = await sb.from("tender_lines").select("sort_order").eq("tender_id", id).order("sort_order", { ascending: false }).limit(1);
  return (last?.[0]?.sort_order ?? -1) + 1;
}

export async function saveParsed(sb: Supabase, id: string, lines: ParsedLine[], filename: string, mode: "replace" | "append", baseOrder: number) {
  const limited = lines.slice(0, MAX_LINES);
  await clearOld(sb, id, mode);
  for (let i = 0; i < limited.length; i += 400) {
    const rows = limited.slice(i, i + 400).map((l, j) => ({
      tender_id: id, sort_order: baseOrder + i + j, kind: l.kind, item_no: l.itemNo || null,
      description: l.description.slice(0, 2000), unit: l.unit || null, quantity: l.quantity,
      rate_cents: l.rateCents, est_rate_cents: l.estRateCents, raw: l.raw.slice(0, 1500),
      ai_unsure: l.aiUnsure, source_ref: l.sourceRef,
    }));
    const { error } = await sb.from("tender_lines").insert(rows);
    if (error) throw new Error(error.message);
  }
  await sb.from("tenders").update({ source_filename: filename, updated_at: new Date().toISOString() }).eq("id", id);
  return limited.length;
}

export async function saveChunks(sb: Supabase, id: string, text: string, filename: string, mode: "replace" | "append") {
  const chunks = chunkText(text, 6000);
  if (!chunks.length) return { ok: false as const, error: "We found no text in that file." };
  await clearOld(sb, id, mode);
  const { error } = await sb.from("tender_sources").insert({ tender_id: id, filename, chunks });
  if (error) return { ok: false as const, error: "We could not store that document for reading. Please try again." };
  await sb.from("tenders").update({ source_filename: filename, updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: true as const, chunks: chunks.length };
}
