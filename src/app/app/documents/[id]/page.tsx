import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { waLink } from "@/lib/dates";
import CopyButton from "../CopyButton";
import { convertToInvoice, markPaid, sendDraft } from "../actions";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*,clients(name,whatsapp_number)").eq("id", id).single();
  if (!d) notFound();
  const { data: biz } = await sb.from("businesses").select("name").single();
  const { data: events } = await sb.from("events").select("type,created_at").eq("document_id", id).order("created_at", { ascending: false });
  const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${base}/d/${d.public_token}`;
  const kind = d.type === "quote" ? "quote" : "invoice";
  const msg = `Hi ${client?.name.split(" ")[0] ?? "there"}, here is your ${kind} ${d.number} from ${biz?.name}: ${link}`;

  const btn = "rounded-xl px-4 py-2 font-bold";
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Link href="/app/documents" className="text-sm text-neutral-500">All documents</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{d.number}</h1>
      <p className="text-neutral-600">{client?.name} · {formatRand(d.total_cents)} · <b>{d.status}</b></p>

      {d.status === "draft" ? (
        <form action={sendDraft} className="mt-5"><input type="hidden" name="id" value={d.id} />
          <button className={`${btn} bg-yebo text-white`}>Mark as sent</button></form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={waLink(client?.whatsapp_number ?? null, msg)} target="_blank" className={`${btn} bg-yebo text-white`}>Send on WhatsApp</a>
          <CopyButton text={link} />
          <a href={link} target="_blank" className={`${btn} border-2 border-neutral-300`}>Open client view</a>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {d.type === "quote" && d.status === "accepted" && (
          <form action={convertToInvoice}><input type="hidden" name="id" value={d.id} />
            <button className={`${btn} bg-neutral-900 text-white`}>Create invoice from this quote</button></form>
        )}
        {d.type === "invoice" && d.status !== "paid" && d.status !== "draft" && (
          <>
            <form action={markPaid}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="eft" />
              <button className={`${btn} border-2 border-yebo text-yebo`}>Mark paid (EFT)</button></form>
            <form action={markPaid}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="method" value="cash" />
              <button className={`${btn} border-2 border-neutral-300`}>Mark paid (cash)</button></form>
          </>
        )}
      </div>

      <h2 className="mt-8 font-extrabold">Activity</h2>
      <ul className="mt-2 divide-y rounded-2xl bg-white shadow-sm ring-1 ring-black/5 text-sm">
        {(events ?? []).map((e, i) => (
          <li key={i} className="flex justify-between p-3"><span>{e.type}</span>
            <span className="text-neutral-500">{new Date(e.created_at).toLocaleString("en-ZA")}</span></li>
        ))}
        {!events?.length && <li className="p-3 text-neutral-500">No activity yet.</li>}
      </ul>
    </main>
  );
}
