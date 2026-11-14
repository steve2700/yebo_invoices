import { createClient } from "@/lib/supabase/server";
import { loadWeek, showWeeklyCard, verdictFor } from "@/lib/weekly";
import WeeklyCardView from "./WeeklyCardView";
import { setWeeklyEmail } from "./weekly-actions";

// "Your week" on the dashboard: Friday from midday through the weekend. It never breaks the dashboard: any problem and it simply is not shown.
export default async function WeeklyCard() {
  if (!showWeeklyCard()) return null;
  try {
    const supabase = await createClient();
    const { data: business } = await supabase.from("businesses").select("id").maybeSingle();
    if (!business) return null;
    const loaded = await loadWeek(supabase, business.id as string);
    if (!loaded || !loaded.week.everSent) return null;
    // weekly_review needs migration 0043; until it is run the switch is hidden and the card still shows.
    const { data: setting, error } = await supabase.from("businesses").select("weekly_review").maybeSingle();
    const emailOn = error ? null : Boolean((setting as { weekly_review?: boolean } | null)?.weekly_review ?? true);
    return <WeeklyCardView week={loaded.week} verdict={verdictFor(loaded.week)} label={loaded.windows.label} emailOn={emailOn} toggle={setWeeklyEmail} />;
  } catch (error) {
    console.error("[weekly] card:", error);
    return null;
  }
}
