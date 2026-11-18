"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { southAfricaDate } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import { duplicateDocument } from "./actions";

const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

// "Send a revised quote": makes an editable copy that remembers which quote it replaces. When the copy is sent, the old
// quote is closed automatically (a database rule), and the client's old link shows a button to the new one.
export async function reviseQuote(fd: FormData) {
  const id = fd.get("id");
  if (!idOk(id)) return;
  const sb = await createClient();
  const { data: old } = await sb.from("documents").select("id,type,status").eq("id", id).maybeSingle();
  if (!old || old.type !== "quote" || old.status === "draft") redirect(`/app/documents/${id}`);
  try {
    await duplicateDocument(fd);
  } catch (e) {
    // duplicateDocument finishes by redirecting to the new draft's edit page. Catch that, note which quote it replaces, then carry on.
    const digest = String((e as { digest?: unknown })?.digest ?? "");
    const m = digest.match(/\/app\/documents\/([0-9a-f-]{36})\/edit/i);
    if (!m) throw e;
    await sb.from("documents").update({ revises_id: id }).eq("id", m[1]);
    redirect(`/app/documents/${m[1]}/edit`);
  }
}

// Moves the due date of an unpaid invoice. Either a quick choice (days from today) or a date picked on the calendar.
export async function changeDueDate(fd: FormData) {
  const id = fd.get("id");
  if (!idOk(id)) return;
  const today = southAfricaDate();
  const days = String(fd.get("days") ?? "");
  let date = String(fd.get("date") ?? "");
  if (/^\d{1,3}$/.test(days)) {
    const base = new Date(today + "T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + Number(days));
    date = base.toISOString().slice(0, 10);
  }
  let result = "bad";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today) {
    const sb = await createClient();
    // RLS only lets you see your own invoices, so finding it here proves it is yours.
    const { data: own } = await sb.from("documents").select("id,type,status").eq("id", id).maybeSingle();
    if (!own || own.type !== "invoice" || !["sent", "viewed", "partially_paid"].includes(own.status)) result = "closed";
    else {
      let saved = await sb.from("documents").update({ due_date: date }).eq("id", id).select("due_date");
      if (saved.error || !saved.data?.length) {
        console.error("[due date] normal save did not stick, retrying:", saved.error?.message ?? "no row changed");
        saved = await createAdminClient().from("documents").update({ due_date: date }).eq("id", id).select("due_date");
      }
      if (saved.error || !saved.data?.length) { console.error("[due date] could not save:", saved.error?.message ?? "no row changed"); result = "failed"; }
      else result = "saved";
    }
  }
  revalidatePath(`/app/documents/${id}`);
  revalidatePath(`/app/documents`);
  revalidatePath("/app");
  redirect(`/app/documents/${id}?due=${result}`);
}

// The client asked "I still want this" on an expired quote: give them 14 more days on the same link.
export async function extendQuote(fd: FormData) {
  const id = fd.get("id");
  if (!idOk(id)) return;
  const sb = await createClient();
  const { count: newer } = await sb.from("documents").select("id", { count: "exact", head: true }).eq("revises_id", id).neq("status", "draft");
  if ((newer ?? 0) === 0) {
    await sb.from("documents").update({ expiry_date: addDays(14), revive_requested_at: null }).eq("id", id).eq("type", "quote").in("status", ["expired", "sent", "viewed"]);
    await sb.from("documents").update({ status: "sent" }).eq("id", id).eq("type", "quote").eq("status", "expired");
  }
  revalidatePath(`/app/documents/${id}`);
  revalidatePath("/app");
  redirect(`/app/documents/${id}`);
}
