import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageBySlug } from "@/lib/opportunities";

export const runtime = "nodejs";

// A visitor tapped "Call now" or "WhatsApp now" on a local page. We only count it; the phone or WhatsApp opens on its own.
export async function POST(request: Request) {
  let body: { b?: unknown; p?: unknown; k?: unknown } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { b, p, k } = body;
  if (typeof b !== "string" || !/^[0-9a-f-]{36}$/i.test(b) || typeof p !== "string" || !pageBySlug(p) || (k !== "call" && k !== "whatsapp")) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("businesses").select("id").eq("id", b).eq("opp_enabled", true).maybeSingle();
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  await admin.from("opportunity_clicks").insert({ business_id: b, page: p, kind: k });
  return NextResponse.json({ ok: true });
}
