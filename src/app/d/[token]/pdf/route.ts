import { createClient } from "@/lib/supabase/server";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, token-based download: the same document the client sees online, as a PDF.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await createClient();
  const { data } = await sb.rpc("get_public_document", { p_token: token });
  if (!data) return new Response("Not found", { status: 404 });
  const { data: signature } = data.document?.type === "quote" && data.document?.status === "accepted" ? await sb.rpc("get_quote_signature", { p_token: token }) : { data: null };
  // The instant-payment number is not in the shared business record, so read it here.
  const { data: payRow } = await createAdminClient().from("documents").select("businesses(payshap_number)").eq("public_token", token).maybeSingle();
  const payshap = (payRow as { businesses?: { payshap_number?: string | null } | null } | null)?.businesses?.payshap_number ?? null;
  const bytes = await buildDocumentPdf({ ...data, business: { ...data.business, payshap_number: payshap }, signature }, `${appUrl()}/d/${token}`);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${String(data.document.number).replace(/[^\w.-]/g, "_")}.pdf"`,
    },
  });
}
