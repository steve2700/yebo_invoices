import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyReviews } from "@/lib/weekly-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs every Friday at 13:00 UTC, which is 15:00 in South Africa (see vercel.json).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await sendWeeklyReviews(createAdminClient());
    return Response.json(result);
  } catch (error) {
    console.error("[weekly] failed:", error);
    return new Response("Failed", { status: 500 });
  }
}
