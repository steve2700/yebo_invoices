import { createAdminClient } from "@/lib/supabase/admin";
import { sendMonthlyReports } from "@/lib/monthly-email";
import { isLastDayOfMonth } from "@/lib/monthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel runs this at 13:00 UTC (15:00 in South Africa) on the 28th to 31st (see vercel.json).
// It only does anything on the last day of the month, so February and 31-day months are right.
// Add ?force=1 to test on any day (each business still gets at most one email per month).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isLastDayOfMonth()) return Response.json({ skipped: "not the last day of the month" });
  try {
    return Response.json(await sendMonthlyReports(createAdminClient()));
  } catch (error) {
    console.error("[monthly] failed:", error);
    return new Response("Failed", { status: 500 });
  }
}
