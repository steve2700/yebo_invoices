import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRand } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { appUrl } from "@/lib/url";
import CopyButton from "../CopyButton";
import AiMessageComposer from "../AiMessageComposer";
import { convertToInvoice, deleteDraft, duplicateDocument, emailDocument, markPaid, sendDraft } from "../actions";
import ConfirmForm from "../ConfirmForm";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: d } = await sb.from("documents").select("*,clients(name,whatsapp_number)").eq("id", id).single();
  if (!d) notFound();
  const [{ data: biz }, { data: events }, { data: payments }] = await Promise.all([
    sb.from("businesses").select("name").single(),
    sb.from("events").select("type,created_at").eq("document_id", id).order("created_at", { ascending: false }),
    sb.from("payments").select("amount_cents").eq("document_id", id),
  ]);
  const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;

  const base = appUrl();
  const link = `${base}/d/${d.public_token}`;
  const kind = d.type === "quote" ? "quote" : "invoice";
  const msg = `Hi ${greetingName(client?.name)}, here is your ${kind} ${d.number} from ${biz?.name}: ${link}`;
  const amountPaid = (payments ?? []).reduce((total, payment) => total + Number(payment.amount_cents), 0);
  const balanceDue = Math.max(Number(d.total_cents) - amountPaid, 0);
  const canSendPaymentReminder = d.type === "invoice" && d.status !== "draft" && d.status !== "paid" && balanceDue > 0;
  const reminderMsg = [
    `Hi ${greetingName(client?.name)},`,
    `A friendly reminder from ${biz?.name ?? "our team"} that invoice ${d.number} has an outstanding balance of ${formatRand(balanceDue)}.`,
    d.due_date ? `Due date: ${formatDate(d.due_date)}.` : null,
    `Please use ${d.number} as your payment reference.`,
    "If you have already paid, thank you. Please disregard this reminder.",
    `View invoice: ${link}`,
  ].filter(Boolean).join("\n\n");

  const btn = "rounded-xl px-4 py-2 font-bold";
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Link href="/app/documents" className="text-sm text-neutral-500">All documents</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{d.number}</h1>
      <p className="text-neutral-600">{client?.name} · {formatRand(d.total_cents)} · <b>{d.status}</b></p>

      <div className="mt-5 flex flex-wrap gap-2 print:hidden">
        {d.status === "draft" && (
          <form action={sendDraft}><input type="hidden" name="id" value={d.id} />
            <button className={`${btn} bg-yebo text-white`}>Mark as sent</button>
          </form>
        )}
        <form action={emailDocument}>
          <input type="hidden" name="id" value={d.id} />
          <button className={`${btn} border-2 border-yebo text-yebo`} disabled={!client?.email}>Email document</button>
        </form>
        <AiMessageComposer mode="intro" documentId={d.id} whatsappNumber={client?.whatsapp_number ?? null} fallbackMessage={msg} />
        <CopyButton text={link} />
        {d.status !== "draft" && <a href={`/d/${d.public_token}/pdf`} className={`${btn} border-2 border-neutral-300`}>Download PDF</a>}
        <a href={link} target="_blank" rel="noreferrer" className={`${btn} border-2 border-neutral-300`}>Open client view</a>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {d.type === "quote" && d.status === "accepted" && (
          <form action={convertToInvoice}><input type="hidden" name="id" value={d.id} />
            <button className={`${btn} bg-neutral-900 text-white`}>Create invoice from this quote</button></form>
        )}
        {canSendPaymentReminder && (
          <div>
            <AiMessageComposer
              mode="reminder"
              documentId={d.id}
              whatsappNumber={client?.whatsapp_number ?? null}
              fallbackMessage={reminderMsg}
              balanceLabel={formatRand(balanceDue)}
            />
          </div>
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

      <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
        {d.status === "draft" && <Link href={`/app/documents/${d.id}/edit`} className={`${btn} border-2 border-neutral-300`}>Edit</Link>}
        <form action={duplicateDocument}><input type="hidden" name="id" value={d.id} />
          <button className={`${btn} border-2 border-neutral-300`}>Duplicate</button></form>
        {d.status === "draft" && <ConfirmForm action={deleteDraft} id={d.id} message="Delete this draft? This cannot be undone." label="Delete draft" className={`${btn} text-red-600 hover:bg-red-50`} />}
      </div>
      {d.status !== "draft" && <p className="mt-2 text-xs text-neutral-500 print:hidden">Sent documents are locked so your client's copy never changes. To fix a mistake, tap Duplicate, correct the copy and send that instead.</p>}

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
