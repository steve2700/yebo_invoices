import { NextResponse } from "next/server";
import { submitOpportunity } from "@/lib/submit-opportunity";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_400_000) return NextResponse.json({ ok: false, error: "The photos are too big. Try fewer or smaller photos." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ ok: false, error: "Could not read that. Please try again." }, { status: 400 }); }
  const res = await submitOpportunity(slug, form);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
