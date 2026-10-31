import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs, validVisitToken } from "@/lib/visit";

export const runtime = "nodejs";

// The "Add to calendar" file for a proposed or confirmed visit.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validVisitToken(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: r } = await admin.from("quote_requests").select("id,visit_at,visit_status,location,business_id").eq("visit_token", token).maybeSingle();
  if (!r?.visit_at || r.visit_status === "declined") return new Response("Not found", { status: 404 });
  const { data: b } = await admin.from("businesses").select("name,phone").eq("id", r.business_id).maybeSingle();
  const name = b?.name ?? "Site visit";
  const body = buildIcs({ id: r.id, start: new Date(r.visit_at), title: `Site visit: ${name}`, where: r.location, description: b?.phone ? `Call ${name}: ${b.phone}` : undefined });
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="site-visit.ics"', "Cache-Control": "no-store" } });
}
