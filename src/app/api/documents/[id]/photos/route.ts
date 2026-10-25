import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sniffImage } from "@/lib/sniff";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_PHOTOS = 6;

// The owner adds photos to a quote (a sketch, the site, the old unit). Files go to private storage and the
// client page shows them through short-lived links.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = (extra = "") => NextResponse.redirect(new URL(`/app/documents/${id}${extra}#photos`, request.url), 303);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  // Row level security means only the owner gets a row back.
  const { data: doc } = await sb.from("documents").select("id,type,status").eq("id", id).maybeSingle();
  if (!doc || doc.type !== "quote" || !["draft", "sent", "viewed"].includes(doc.status)) return back("?photos=no");

  let form: FormData;
  try { form = await request.formData(); } catch { return back("?photos=bad"); }
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return back("?photos=bad");

  const { count } = await sb.from("document_photos").select("id", { count: "exact", head: true }).eq("document_id", id);
  const room = MAX_PHOTOS - (count ?? 0);
  if (room <= 0) return back("?photos=full");

  const admin = createAdminClient();
  let added = 0, rejected = 0;
  for (const file of files.slice(0, room)) {
    if (file.size > MAX_BYTES) { rejected++; continue; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) { rejected++; continue; }
    const path = `${id}/${Date.now()}-${added}.${kind.ext}`;
    const { error } = await admin.storage.from("quote-photos").upload(path, bytes, { contentType: kind.type, upsert: false });
    if (error) { console.error("[photos] upload failed:", error.message); rejected++; continue; }
    const { error: rowError } = await sb.from("document_photos").insert({ document_id: id, path });
    if (rowError) { await admin.storage.from("quote-photos").remove([path]); rejected++; continue; }
    added++;
  }
  return back(`?photos=${added ? (rejected || files.length > room ? "some" : "ok") : "bad"}`);
}
