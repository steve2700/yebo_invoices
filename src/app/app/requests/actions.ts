"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { phoneKey } from "@/lib/requests";

const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// "Make a quote": finds or creates the client from the request, then opens the new-quote form with the job already filled in.
export async function startQuoteFromRequest(formData: FormData) {
  const id = formData.get("id");
  if (!idOk(id)) return;
  const sb = await createClient();
  const { data: req } = await sb.from("quote_requests").select("id,business_id,name,whatsapp,email,client_id").eq("id", id).maybeSingle();
  if (!req) return;

  let clientId: string | null = req.client_id;
  if (!clientId) {
    const { data: clients } = await sb.from("clients").select("id,name,whatsapp_number").limit(1000);
    const key = phoneKey(req.whatsapp);
    const found = (clients ?? []).find((c) =>
      (key && phoneKey(c.whatsapp_number) === key) || c.name.trim().toLowerCase() === String(req.name).trim().toLowerCase());
    if (found) clientId = found.id;
  }
  if (!clientId) {
    const { data: created, error } = await sb
      .from("clients")
      .insert({ business_id: req.business_id, name: req.name, whatsapp_number: req.whatsapp, email: req.email })
      .select("id")
      .single();
    if (error || !created) redirect("/app/requests?e=client");
    clientId = created.id;
  }
  await sb.from("quote_requests").update({ status: "quoted", client_id: clientId }).eq("id", req.id);
  revalidatePath("/app/requests");
  redirect(`/app/quotes/new?request=${req.id}`);
}

export async function dismissRequest(formData: FormData) {
  const id = formData.get("id");
  if (!idOk(id)) return;
  const sb = await createClient();
  await sb.from("quote_requests").update({ status: "dismissed" }).eq("id", id);
  revalidatePath("/app/requests");
}
