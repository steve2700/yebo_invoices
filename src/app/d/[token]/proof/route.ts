import { NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyInvoiceClaimed } from "@/lib/notify-quote";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_INVOICE = 3;

// Sniffs the real file type from its first bytes, so a renamed file cannot be passed off as a photo or PDF.
function sniff(b: Uint8Array): { ext: string; type: string } | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { ext: "pdf", type: "application/pdf" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}

// The client taps "I have paid by EFT", optionally with a screenshot or PDF of the bank's confirmation.
// The file goes into private storage that only the invoice owner can open (through a short-lived link).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const back = (extra = "") => NextResponse.redirect(new URL(`/d/${token}${extra}#pay`, request.url), 303);
  if (!/^[A-Za-z0-9]{16,80}$/.test(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let form: FormData;
  try { form = await request.formData(); } catch { return back("?proof=bad"); }

  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id,type,status").eq("public_token", token).maybeSingle();
  if (!doc || doc.type !== "invoice" || !["sent", "viewed", "partially_paid"].includes(doc.status)) return back();

  const file = form.get("file");
  let stored = false;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return back("?proof=bad");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) return back("?proof=bad");
    const { count } = await admin.from("document_messages").select("id", { count: "exact", head: true }).eq("document_id", doc.id).eq("kind", "proof");
    if ((count ?? 0) < MAX_PER_INVOICE) {
      const path = `${doc.id}/${Date.now()}.${kind.ext}`;
      const { error } = await admin.storage.from("payment-proofs").upload(path, bytes, { contentType: kind.type, upsert: false });
      if (error) { console.error("[proof] upload failed:", error.message); return back("?proof=bad"); }
      await admin.from("document_messages").insert({ document_id: doc.id, kind: "proof", file_path: path });
      stored = true;
    }
  }

  const { data: isNew } = await admin.rpc("claim_invoice_paid", { p_token: token });
  if (isNew || stored) after(() => notifyInvoiceClaimed(token, stored));
  return back();
}
