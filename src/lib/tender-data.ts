/* eslint-disable @typescript-eslint/no-explicit-any */
// Server only. Loads tender lines and the compliance vault in the shape the screens and the PDF builder use.
import type { createClient } from "@/lib/supabase/server";
import type { TenderLine, Vault } from "@/lib/tenders";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function rowToLine(r: any): TenderLine {
  return {
    id: r.id,
    kind: r.kind === "heading" ? "heading" : "item",
    itemNo: r.item_no ?? "",
    description: r.description ?? "",
    unit: r.unit ?? "",
    quantity: r.quantity == null ? null : Number(r.quantity),
    rateCents: r.rate_cents == null ? null : Number(r.rate_cents),
    estRateCents: r.est_rate_cents == null ? null : Number(r.est_rate_cents),
    raw: r.raw ?? "",
    aiUnsure: Boolean(r.ai_unsure),
  };
}

// Supabase returns at most 1000 rows a call, and a big BOQ can have thousands of lines, so read in pages.
export async function loadTenderLines(sb: Supabase, tenderId: string): Promise<TenderLine[]> {
  const out: TenderLine[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("tender_lines")
      .select("id,kind,item_no,description,unit,quantity,rate_cents,est_rate_cents,raw,ai_unsure,sort_order")
      .eq("tender_id", tenderId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error || !data) break;
    out.push(...data.map(rowToLine));
    if (data.length < 1000) break;
  }
  return out;
}

export async function loadVault(sb: Supabase, businessId: string): Promise<Vault | null> {
  const { data } = await sb
    .from("compliance_vault")
    .select("csd_number,csd_path,sars_pin,sars_expiry,sars_path,bbbee_level,bbbee_expiry,bbbee_path,coida_expiry,coida_path")
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as Vault | null) ?? null;
}
