import { NextResponse } from "next/server";
import { submitRequest } from "@/lib/submit-request";

export const runtime = "nodejs";
export const maxDuration = 30;

// The public request form posts here (not a server action) because photos can be bigger than a server action allows.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_400_000) return NextResponse.json({ ok: false, error: "The photos are too big. Try fewer or smaller photos." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ ok: false, error: "Could not read that. Please try again." }, { status: 400 }); }
  const res = await submitRequest(token, form);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
