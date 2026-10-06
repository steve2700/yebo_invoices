import { createClient } from "@/lib/supabase/server";
import { buildDocumentPdf } from "@/lib/pdf";
import { appUrl } from "@/lib/url";

// Public, token-based download: the same document the client sees online, as a PDF.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await createClient();
  const { data } = await sb.rpc("get_public_document", { p_token: token });
  if (!data) return new Response("Not found", { status: 404 });
  const bytes = await buildDocumentPdf(data, `${appUrl()}/d/${token}`);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${String(data.document.number).replace(/[^\w.-]/g, "_")}.pdf"`,
    },
  });
}
