import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, tenderAccess } from "@/lib/tender-access";
import { buildPricedBoqXlsx } from "@/lib/tender-xlsx";
import { loadTenderLines } from "@/lib/tender-data";

export const runtime = "nodejs";

// Downloads the priced BOQ as an Excel file (with live formulas).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse("Not found", { status: 404 });
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Please sign in", { status: 401 });
  if (!(await tenderAccess(sb)).allowed) return new NextResponse("The Tender Engine is part of The Industry King plan.", { status: 402 });

  const { data: tender } = await sb.from("tenders").select("id,reference,title,client_name,vat_percent,business_id").eq("id", id).maybeSingle();
  if (!tender) return new NextResponse("Not found", { status: 404 });
  const { data: business } = await sb.from("businesses").select("name").eq("id", tender.business_id).maybeSingle();
  const lines = await loadTenderLines(sb, id);
  const bytes = await buildPricedBoqXlsx({
    businessName: business?.name ?? "Yebo Invoices",
    tender: { reference: tender.reference, title: tender.title, client_name: tender.client_name, vat_percent: Number(tender.vat_percent) },
    lines,
  });
  const safe = (tender.reference || tender.title).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "tender";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="priced-boq-${safe}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
