"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  tenderId: string;
  /** "add" keeps the lines already on the tender. "replace" clears them first. */
  hasLines: boolean;
  /** True when the tender came from the hub and has documents Yebo can read itself. */
  canAuto?: boolean;
  onDone: () => void;
};

type Phase = { text: string; done: number; total: number } | null;

const ACCEPT = ".xlsx,.xlsm,.csv,.pdf,.txt";
const MAX_BYTES = 50 * 1024 * 1024;

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: typeof json?.error === "string" ? json.error : "Something went wrong. Please try again." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "No connection. Check your signal and try again." };
  }
}

type ImportReply = { kind: "lines"; itemCount: number; sheet?: string } | { kind: "chunks"; chunks: number; baseOrder: number; note?: string };

// Uploads a BOQ straight to private storage (so big files are fine), then reads it. Big PDFs are read in pieces
// with a progress bar, and any piece that fails can be retried on its own.
export default function BoqImporter({ tenderId, hasLines, canAuto = false, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"append" | "replace">(hasLines ? "append" : "replace");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState<number[]>([]);
  const [resume, setResume] = useState<{ chunks: number; baseOrder: number } | null>(null);

  async function readChunks(indices: number[], total: number, baseOrder: number) {
    const bad: number[] = [];
    let items = 0;
    for (let n = 0; n < indices.length; n++) {
      const index = indices[n];
      setPhase({ text: `Reading part ${index + 1} of ${total}`, done: n, total: indices.length });
      const res = await post<{ items: number }>(`/api/tenders/${tenderId}/parse-chunk`, { index, baseOrder });
      if (res.ok) items += res.data.items;
      else {
        bad.push(index);
        // A plan or sign-in problem will fail every part, so stop early instead of waiting through all of them.
        if (/plan|sign in/i.test(res.error)) { setError(res.error); break; }
      }
    }
    setPhase(null);
    return { bad, items };
  }

  async function finish(bad: number[], items: number) {
    if (bad.length) {
      setFailed(bad);
      setNote(`${items} items read. ${bad.length} part${bad.length === 1 ? "" : "s"} could not be read. Retry them, or add those lines by hand.`);
      return;
    }
    setNote(`${items} items read. Check each line against the original, then add your rates.`);
    onDone();
  }

  async function start() {
    setError(""); setNote(""); setFailed([]);
    if (!file && !text.trim()) { setError("Choose a BOQ file or paste the BOQ text first."); return; }
    if (file && file.size > MAX_BYTES) { setError("That file is over 50 MB. Send only the pricing pages."); return; }
    if (mode === "replace" && hasLines && !window.confirm("This will remove the lines already on this tender, including any rates you typed. Continue?")) return;
    setBusy(true);
    try {
      let path: string | undefined;
      if (file) {
        setPhase({ text: "Uploading your file", done: 0, total: 1 });
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setError("Please sign in again."); return; }
        const safe = file.name.replace(/[^a-z0-9._-]+/gi, "_").slice(-80);
        path = `${user.id}/boq/${tenderId}/${Date.now()}-${safe}`;
        const { error: upError } = await sb.storage.from("tender-files").upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (upError) { setError("The upload failed. Check your signal and try again."); return; }
      }
      setPhase({ text: "Opening the document", done: 0, total: 1 });
      const res = await post<ImportReply>(`/api/tenders/${tenderId}/import`, { path, filename: file?.name, text: file ? undefined : text, mode });
      if (!res.ok) { setError(res.error); return; }
      if (res.data.kind === "lines") {
        setPhase(null);
        setNote(`${res.data.itemCount} items found${res.data.sheet ? ` on sheet "${res.data.sheet}"` : ""}. Check each line, then add your rates.`);
        onDone();
        return;
      }
      if (res.data.note) setNote(res.data.note);
      setResume({ chunks: res.data.chunks, baseOrder: res.data.baseOrder });
      const all = Array.from({ length: res.data.chunks }, (_, i) => i);
      const { bad, items } = await readChunks(all, res.data.chunks, res.data.baseOrder);
      await finish(bad, items);
    } finally {
      setBusy(false);
      setPhase(null);
    }
  }

  async function auto() {
    setError(""); setNote(""); setFailed([]);
    if (hasLines && !window.confirm("This will replace the lines already on this tender, including any rates you typed. Continue?")) return;
    setBusy(true);
    try {
      setPhase({ text: "Reading the tender documents", done: 0, total: 1 });
      const res = await post<ImportReply & { note?: string }>(`/api/tenders/${tenderId}/auto-import`, {});
      if (!res.ok) { setError(res.error); return; }
      if (res.data.kind === "lines") {
        setPhase(null);
        setNote(`${res.data.itemCount} items found. ${res.data.note ?? ""} Check each line, then add your rates.`.trim());
        onDone();
        return;
      }
      if (res.data.note) setNote(res.data.note);
      setResume({ chunks: res.data.chunks, baseOrder: res.data.baseOrder });
      const all = Array.from({ length: res.data.chunks }, (_, i) => i);
      const { bad, items } = await readChunks(all, res.data.chunks, res.data.baseOrder);
      await finish(bad, items);
    } finally { setBusy(false); setPhase(null); }
  }

  async function retryFailed() {
    if (!resume) return;
    setBusy(true); setError("");
    try {
      const { bad, items } = await readChunks(failed, resume.chunks, resume.baseOrder);
      setFailed(bad);
      if (!bad.length) { setNote(`Done. ${items} more items read.`); onDone(); }
      else setNote(`${bad.length} part${bad.length === 1 ? "" : "s"} still could not be read.`);
    } finally { setBusy(false); setPhase(null); }
  }

  const pct = phase ? Math.round((phase.done / Math.max(phase.total, 1)) * 100) : 0;
  return (
    <div className="rounded-2xl border border-yebo-deep/10 bg-white p-4 sm:p-5">
      {canAuto && (
        <div className="mb-4 rounded-xl bg-lime/25 p-3">
          <p className="text-sm font-black text-ink">Let Yebo read the tender documents</p>
          <p className="mt-1 text-sm text-ink/70">Finds what needs pricing, and how and where to submit. No downloading needed.</p>
          <button type="button" onClick={auto} disabled={busy} className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white hover:bg-yebo-deep disabled:opacity-50">{busy ? "Working…" : "Read the documents for me"}</button>
        </div>
      )}
      <p className="text-sm font-black text-ink">{canAuto ? "Or import a BOQ yourself" : "Import a BOQ"}</p>
      <p className="mt-1 text-sm text-ink/60">Excel (.xlsx), CSV or PDF, up to 50 MB. Excel is read exactly. Small pricing tables in PDFs are read exactly, longer ones by AI, so check each line against the original.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" id={`boq-file-${tenderId}`} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); }} />
        <label htmlFor={`boq-file-${tenderId}`} className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-yebo-deep/15 bg-yebo-chalk px-4 text-sm font-bold text-ink hover:border-yebo">
          {file ? "Change file" : "Choose file"}
        </label>
        {file && <span className="min-w-0 truncate text-sm text-ink/70">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>}
      </div>
      {!file && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-yebo">Or paste the BOQ text</summary>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste rows copied from Excel or a PDF" className="mt-2 w-full rounded-xl border border-yebo-deep/10 bg-yebo-chalk/40 p-3 text-sm outline-none focus:border-yebo focus:bg-white" />
        </details>
      )}
      {hasLines && (
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} /> Add to the lines already here</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace everything</label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white hover:bg-yebo-deep disabled:opacity-50">
          {busy ? "Working…" : "Read the BOQ"}
        </button>
        {failed.length > 0 && !busy && (
          <>
            <button type="button" onClick={retryFailed} className="inline-flex min-h-11 items-center rounded-xl border border-orange/40 bg-orange/10 px-4 text-sm font-bold text-ink">Retry the {failed.length} failed part{failed.length === 1 ? "" : "s"}</button>
            <button type="button" onClick={onDone} className="inline-flex min-h-11 items-center rounded-xl border border-yebo-deep/15 px-4 text-sm font-bold text-ink">Continue with what was read</button>
          </>
        )}
      </div>
      {phase && (
        <div className="mt-4" role="status">
          <div className="flex justify-between text-xs font-semibold text-ink/60"><span>{phase.text}</span><span>{pct}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-yebo-chalk"><div className="h-full rounded-full bg-yebo transition-all" style={{ width: `${Math.max(pct, 4)}%` }} /></div>
        </div>
      )}
      {note && <p className="mt-3 rounded-xl bg-lime/25 px-3 py-2 text-sm font-semibold text-ink" role="status">{note}</p>}
      {error && <p className="mt-3 rounded-xl bg-orange/10 px-3 py-2 text-sm font-semibold text-ink" role="alert">{error}</p>}
    </div>
  );
}
