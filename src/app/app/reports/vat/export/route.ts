import { createClient } from "@/lib/supabase/server";
import { entitlement } from "@/lib/subscription";
import { loadInvoiceBasis, loadPaymentsBasis } from "@/lib/vat-data";
import { invoiceRegisterCsv, isIsoDate, paymentRegisterCsv } from "@/lib/vat-report";

export const dynamic = "force-dynamic";

// Downloads the VAT sales summary as a CSV file (opens in Excel and Google Sheets).
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in again.", { status: 401 });

  const ent = await entitlement(supabase);
  if (ent.enforced && ent.plan?.id !== "king") {
    return new Response("The VAT sales summary is part of The Industry King plan.", { status: 402 });
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const basis = params.get("basis") === "payments" ? "payments" : "invoice";
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) return new Response("Please choose a valid period.", { status: 400 });

  try {
    const csv = basis === "payments" ? paymentRegisterCsv(await loadPaymentsBasis(supabase, from, to)) : invoiceRegisterCsv(await loadInvoiceBasis(supabase, from, to));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="yebo-vat-sales-${basis === "payments" ? "payments" : "invoices"}-${from}-to-${to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[vat-report] export failed:", error);
    return new Response("We could not build that file. Please try again.", { status: 500 });
  }
}
