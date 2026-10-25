import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ROBOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|skype|curl|wget|headless|lighthouse|monitor|python|java\//i;

// Called by the browser a moment after the customer's page has opened. Link-preview robots never run it,
// and the owner is skipped here, whether signed in on this device or not.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(token)) return NextResponse.json({ counted: false });
  if (ROBOT.test(request.headers.get("user-agent") ?? "")) return NextResponse.json({ counted: false });
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    // Only the owner can read their own document by its token, so a row here means the owner is looking.
    const { data: own } = await sb.from("documents").select("id").eq("public_token", token).maybeSingle();
    if (own) return NextResponse.json({ counted: false, reason: "owner" });
  }
  await sb.rpc("record_customer_view", { p_token: token });
  return NextResponse.json({ counted: true });
}
