import { createClient } from "@/lib/supabase/server";
import InstantPayNudge from "./InstantPayNudge";

// Shows the nudge only to owners with a business and no instant-payment number. Any failure shows nothing.
export default async function InstantPayCard() {
  try {
    const sb = await createClient();
    const { data, error } = await sb.from("businesses").select("payshap_number").maybeSingle();
    if (error || !data || data.payshap_number) return null;
    return <InstantPayNudge />;
  } catch {
    return null;
  }
}
