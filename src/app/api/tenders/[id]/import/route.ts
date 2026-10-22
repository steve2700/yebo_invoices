import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TENDER_BUCKET, UUID_RE, tenderAccess } from "@/lib/tender-access";
import { chunkText, parseBoqGrid, parseCsv, type ParsedLine } from "@/lib/boq-grid";
import { extractPdfText, gridToText, readWorkbookGrids } from "@/lib/boq-read";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_LINES = 5000;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type Body = { path?: string; filename?: string; text?: string; mode?: "replace" | "append" };

// Step 1 of reading a BOQ. Spreadsheets are read straight into lines. PDFs and pasted text are cut into pieces,
// and the browser then asks for each piece to be read (see parse-chunk), so a huge document never times out.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return fail("We could not find that tender.", 404);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail("Please sign in again.", 401);
  if (!(await tenderAccess(sb)).allowed) return fail("The Tender Engine is part of The Industry King plan.", 402);

  const { data: tender } = await sb.from("tenders").select("id").eq("id", id).maybeSingle();
  if (!tender) return fail("We could not find that tender.", 404);

  let body: Body;
  try { body = (await request.json()) as Body; } catch { return fail("That request could not be read."); }
  const mode = body.mode === "append" ? "append" : "replace";

  // ---- get the content ----
  let filename = (body.filename ?? "pasted-boq.txt").slice(0, 200);
  let data: Uint8Array | null = null;
  let pastedText: string | null = null;
  if (typeof body.text === "string" && body.text.trim().length > 0) {
    pastedText = body.text.slice(0, 2_000_000);
    filename = "pasted-boq.txt";
  } else if (typeof body.path === "string") {
    // Only files in this user's own folder can be read.
    if (!body.path.startsWith(`${user.id}/`) || body.path.includes("..")) return fail("That file is not yours to import.", 403);
    const { data: blob, error } = await sb.storage.from(TENDER_BUCKET).download(body.path);
    if (error || !blob) return fail("We could not open the uploaded file. Please upload it again.");
    if (blob.size > MAX_FILE_BYTES) return fail("That file is over 50 MB. Split it or send only the pricing pages.", 413);
    data = new Uint8Array(await blob.arrayBuffer());
    filename = filename || body.path.split("/").pop() || "boq";
  } else return fail("Choose a file or paste the BOQ text.");

  // ---- where new lines start ----
  let baseOrder = 0;
  if (mode === "append") {
    const { data: last } = await sb.from("tender_lines").select("sort_order").eq("tender_id", id).order("sort_order", { ascending: false }).limit(1);
    baseOrder = (last?.[0]?.sort_order ?? -1) + 1;
  }
  const clearOld = async () => {
    // Adding to a tender keeps every line already there. Replacing removes them all.
    if (mode === "replace") await sb.from("tender_lines").delete().eq("tender_id", id);
    await sb.from("tender_sources").delete().eq("tender_id", id);
  };

  const saveLines = async (lines: ParsedLine[]) => {
    const limited = lines.slice(0, MAX_LINES);
    await clearOld();
    for (let i = 0; i < limited.length; i += 400) {
      const rows = limited.slice(i, i + 400).map((l, j) => ({
        tender_id: id,
        sort_order: baseOrder + i + j,
        kind: l.kind,
        item_no: l.itemNo || null,
        description: l.description.slice(0, 2000),
        unit: l.unit || null,
        quantity: l.quantity,
        rate_cents: l.rateCents,
        est_rate_cents: l.estRateCents,
        raw: l.raw.slice(0, 1500),
        ai_unsure: l.aiUnsure,
        source_ref: l.sourceRef,
      }));
      const { error } = await sb.from("tender_lines").insert(rows);
      if (error) throw new Error(error.message);
    }
    await sb.from("tenders").update({ source_filename: filename, updated_at: new Date().toISOString() }).eq("id", id);
    return limited.length;
  };

  const startChunks = async (text: string) => {
    const chunks = chunkText(text, 6000);
    if (!chunks.length) return fail("We found no text in that file.", 422);
    await clearOld();
    const { error } = await sb.from("tender_sources").insert({ tender_id: id, filename, chunks });
    if (error) return fail("We could not store that document for reading. Please try again.", 500);
    await sb.from("tenders").update({ source_filename: filename, updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ kind: "chunks", chunks: chunks.length, baseOrder });
  };

  try {
    if (pastedText !== null) {
      // Pasted spreadsheet text (tabs) is read directly if it has a header, otherwise by the AI reader.
      const grid = pastedText.split(/\r?\n/).map((l) => l.split("\t"));
      const direct = parseBoqGrid(grid, "paste");
      if (direct.itemCount > 0) {
        const n = await saveLines(direct.lines);
        return NextResponse.json({ kind: "lines", itemCount: direct.itemCount, lineCount: n, baseOrder });
      }
      return await startChunks(pastedText);
    }

    const lower = filename.toLowerCase();
    if (!data) return fail("Choose a file first.");

    if (/\.(xlsx|xlsm)$/.test(lower)) {
      const sheets = await readWorkbookGrids(data);
      let best: { name: string; lines: ParsedLine[]; itemCount: number } | null = null;
      for (const s of sheets) {
        const res = parseBoqGrid(s.grid, `sheet:${s.name}`);
        if (res.itemCount > (best?.itemCount ?? 0)) best = { name: s.name, lines: res.lines, itemCount: res.itemCount };
      }
      if (best) {
        const n = await saveLines(best.lines);
        return NextResponse.json({ kind: "lines", itemCount: best.itemCount, lineCount: n, sheet: best.name, baseOrder });
      }
      // No Description / Qty header found: let the AI reader try the text of every sheet.
      return await startChunks(sheets.map((s) => `--- Sheet ${s.name} ---\n${gridToText(s.grid)}`).join("\n"));
    }
    if (lower.endsWith(".xls")) return fail("Old .xls files are not supported. Open it in Excel and Save As .xlsx, or upload the PDF.", 415);

    if (lower.endsWith(".csv")) {
      const grid = parseCsv(new TextDecoder().decode(data));
      const res = parseBoqGrid(grid, "csv");
      if (res.itemCount > 0) {
        const n = await saveLines(res.lines);
        return NextResponse.json({ kind: "lines", itemCount: res.itemCount, lineCount: n, baseOrder });
      }
      return await startChunks(gridToText(grid));
    }

    if (lower.endsWith(".pdf")) {
      const { text, pages, readPages } = await extractPdfText(data);
      if (text.replace(/--- Page \d+ ---/g, "").trim().length < 40) {
        return fail("This PDF looks like a scan (pictures of pages), so there is no text to read. Ask the client for the Excel BOQ, or use a PDF that was saved from Word or Excel.", 422);
      }
      const res = await startChunks(text);
      if (res instanceof NextResponse && res.status === 200 && pages > readPages) {
        const json = await res.json();
        return NextResponse.json({ ...json, note: `Only the first ${readPages} of ${pages} pages were read.` });
      }
      return res;
    }

    if (lower.endsWith(".txt")) return await startChunks(new TextDecoder().decode(data));
    return fail("Use an Excel (.xlsx), CSV or PDF file. Word files can be saved as PDF first.", 415);
  } catch (error) {
    console.error("[tenders/import] failed:", error);
    return fail("We could not read that file. Check that it opens normally, or try the Excel version.", 500);
  }
}
