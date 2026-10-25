import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, tenderAccess } from "@/lib/tender-access";
import { parseBoqGrid, type ParsedLine } from "@/lib/boq-grid";
import { extractPdfText, readWorkbookGrids } from "@/lib/boq-read";
import { nextOrder, saveChunks, saveInfo, saveParsed } from "@/lib/tender-ingest";
import { classifyDoc, describePages, extractTenderInfo, pickPricingPages, readPricingTable, type DocKind } from "@/lib/tender-docs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOCS = 8;
const MAX_BYTES = 30 * 1024 * 1024;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type Got = { name: string; kind: DocKind; text: string | null; sheets: { name: string; grid: (string | number | null | undefined)[][] }[] | null };

async function fetchDoc(title: string, url: string): Promise<Got | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25_000), headers: { "User-Agent": "YeboInvoices/1.0" } });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length > MAX_BYTES) return null;
    const disp = res.headers.get("content-disposition") ?? "";
    const fromHeader = disp.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1];
    const name = decodeURIComponent(fromHeader ?? "").trim() || title;
    const kind = classifyDoc(`${title} ${name}`);
    const magic = String.fromCharCode(...data.slice(0, 4));
    if (magic === "%PDF") {
      const { text } = await extractPdfText(data);
      return { name, kind, text, sheets: null };
    }
    if (magic.startsWith("PK")) return { name, kind, text: null, sheets: await readWorkbookGrids(data) };
    return null;
  } catch (e) {
    console.error("[tenders/auto-import] fetch failed:", url, e);
    return null;
  }
}

// Reads the documents that came with the tender from the hub, so nothing has to be downloaded and uploaded by hand.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("We could not find that tender.", 404);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail("Please sign in again.", 401);
  if (!(await tenderAccess(sb)).allowed) return fail("The Tender Engine is part of The Industry King plan.", 402);

  const { data: tender } = await sb.from("tenders").select("id,feed_id").eq("id", id).maybeSingle();
  if (!tender) return fail("We could not find that tender.", 404);
  if (!tender.feed_id) return fail("This tender did not come from the hub, so there are no documents to read.");
  const { data: feed } = await sb.from("tender_feed").select("documents").eq("id", tender.feed_id).maybeSingle();
  const links = ((feed?.documents ?? []) as { title?: unknown; url?: unknown }[])
    .filter((d) => typeof d.url === "string" && /^https:\/\//i.test(d.url))
    .map((d) => ({ title: typeof d.title === "string" && d.title ? d.title : "Tender document", url: d.url as string }))
    .slice(0, MAX_DOCS);
  if (!links.length) return fail("The hub has no documents for this tender. Use Import a BOQ instead.");

  const got = (await Promise.all(links.map((l) => fetchDoc(l.title, l.url)))).filter((g): g is Got => !!g);
  if (!got.length) return fail("We could not open the documents from the hub. Download the BOQ and use Import a BOQ instead.", 422);

  try {
    const textDocs = got.filter((g) => g.text && g.text.replace(/--- Page \d+ ---/g, "").trim().length > 40) as (Got & { text: string })[];
    const info = await saveInfo(sb, id, extractTenderInfo(textDocs.map((d) => ({ name: d.name, kind: d.kind, text: d.text }))));
    const baseOrder = await nextOrder(sb, id, "replace");
    const filename = got.map((g) => g.name).join(", ").slice(0, 200);

    // 1. An Excel BOQ is exact.
    for (const g of got) {
      if (!g.sheets) continue;
      let best: { lines: ParsedLine[]; itemCount: number } | null = null;
      for (const s of g.sheets) {
        const r = parseBoqGrid(s.grid, `sheet:${s.name}`);
        if (r.itemCount > (best?.itemCount ?? 0)) best = { lines: r.lines, itemCount: r.itemCount };
      }
      if (best) {
        const n = await saveParsed(sb, id, best.lines, g.name, "replace", baseOrder);
        return NextResponse.json({ kind: "lines", itemCount: n, baseOrder, info, note: `Read the BOQ from ${g.name}.` });
      }
    }

    // 2. The pricing schedule if there is one, otherwise the pricing pages inside the RFQ.
    const pricingDoc = textDocs.find((d) => d.kind === "pricing");
    const source = pricingDoc ?? textDocs.find((d) => d.kind === "rfq") ?? textDocs[0];
    if (!source) return fail("We opened the documents but found no pricing in them. Use Import a BOQ with the pricing file.", 422);
    const pick = pricingDoc ? { text: pricingDoc.text, pages: [] as number[], totalPages: 0, targeted: false } : pickPricingPages(source.text);
    const where = pick.targeted ? `Pricing found on page${pick.pages.length > 1 ? "s" : ""} ${describePages(pick.pages)} of ${pick.totalPages} of ${source.name}.` : `Read ${source.name}.`;
    const table = readPricingTable(pick.text);
    if (table.confident) {
      const lines: ParsedLine[] = table.lines.map((l) => ({
        kind: "item", itemNo: l.itemNo, description: l.description, unit: l.unit, quantity: l.quantity, rateCents: null, estRateCents: null,
        raw: l.raw, aiUnsure: l.unsure, sourceRef: "table",
      }));
      const n = await saveParsed(sb, id, lines, source.name, "replace", baseOrder);
      return NextResponse.json({ kind: "lines", itemCount: n, baseOrder, info, note: where });
    }
    const r = await saveChunks(sb, id, pick.text, source.name, "replace");
    if (!r.ok) return fail(r.error, 422);
    await sb.from("tender_lines").delete().eq("tender_id", id);
    return NextResponse.json({ kind: "chunks", chunks: r.chunks, baseOrder, info, note: where });
  } catch (error) {
    console.error("[tenders/auto-import] failed:", error);
    return fail("We could not read those documents. Use Import a BOQ with the file instead.", 500);
  }
}
