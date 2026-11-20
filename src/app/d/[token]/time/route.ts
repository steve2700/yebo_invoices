import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ROBOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|skype|curl|wget|headless|lighthouse|monitor|python|java\//i;

// How long the customer's page has been open and how far they scrolled. Same rules as "seen": robots and the owner are skipped.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(token)) return NextResponse.json({ counted: false });
  if (ROBOT.test(request.headers.get("user-agent") ?? "")) return NextResponse.json({ counted: false });
  let seconds = 0;
  let scroll = 0;
  try {
    const body = (await request.json()) as { seconds?: unknown; scroll?: unknown };
    seconds = Math.min(1800, Math.max(0, Math.round(Number(body.seconds) || 0)));
    scroll = Math.min(100, Math.max(0, Math.round(Number(body.scroll) || 0)));
  } catch { return NextResponse.json({ counted: false }); }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: own } = await sb.from("documents").select("id").eq("public_token", token).maybeSingle();
    if (own) return NextResponse.json({ counted: false, reason: "owner" });
  }
  await sb.rpc("record_view_time", { p_token: token, p_seconds: seconds, p_scroll: scroll });
  return NextResponse.json({ counted: true });
}
