"use client";
import { useEffect, useRef, useState } from "react";
import { quietSaveDraft, type SavedClient } from "./quiet-save";
import type { NewQuote } from "./actions";

// Keeps what you are typing, so leaving the page (to copy a number from WhatsApp, to get wording from an AI chat, or because the
// phone reloaded the tab) never costs you your work. Two layers:
//  1. Every change is saved on this device within half a second, and the moment the page is hidden.
//  2. Once there is a client and a priced item, a real draft is saved in Yebo a few seconds after you stop typing.
const VERSION = 1;

export type Snapshot = { clientId: string; newClient: { name: string; whatsapp: string; email: string; address: string }; fields: unknown; lines: unknown; useOptions: boolean; contactFix: { email: string; whatsapp: string }; serverId: string | null };

type Stored = Snapshot & { v: number; savedAt: number };

export const draftStorageKey = (docType: string, documentId?: string, initialClient?: string) => `yebo:form:${docType}:${documentId ?? (initialClient ? "from-" + initialClient : "new")}`;
export function clearStoredDraft(key: string) { try { window.localStorage.removeItem(key); } catch { /* storage can be blocked */ } }

const hasWork = (s: Snapshot) => {
  const f = s.fields as Record<string, unknown>;
  const lines = (s.lines as { description?: string; price?: number }[]) ?? [];
  return Boolean(s.newClient.name.trim() || s.newClient.whatsapp.trim() || s.newClient.email.trim() || String(f?.title ?? "").trim() || String(f?.description ?? "").trim() || lines.some((l) => (l.description ?? "").trim() || (l.price ?? 0) > 0));
};

export default function DraftKeeper({ draftKey, restore, snapshot, canSave, busy, buildPayload, onRestore, onSaved, onClientCreated, documentId }: {
  draftKey: string; restore: boolean; snapshot: Snapshot; canSave: boolean; busy: boolean; documentId?: string;
  buildPayload: () => NewQuote; onRestore: (s: Snapshot) => void; onSaved: (id: string) => void; onClientCreated: (c: SavedClient) => void;
}) {
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ready = useRef(false);
  const snap = useRef(snapshot);
  snap.current = snapshot;
  const payload = useRef(buildPayload);
  payload.current = buildPayload;
  const saving = useRef(false);
  const firstSig = useRef<string | null>(null);

  // On first load: put back what was typed before, if anything.
  useEffect(() => {
    try {
      if (restore) {
        const raw = window.localStorage.getItem(draftKey);
        const s = raw ? (JSON.parse(raw) as Stored) : null;
        if (s && s.v === VERSION && Date.now() - s.savedAt < 14 * 86400000 && hasWork(s)) { onRestore(s); setRestored(true); }
      }
    } catch { /* storage can be blocked or damaged: start normally */ }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeNow = () => {
    if (!ready.current) return;
    try {
      if (hasWork(snap.current)) window.localStorage.setItem(draftKey, JSON.stringify({ ...snap.current, v: VERSION, savedAt: Date.now() } satisfies Stored));
    } catch { /* storage can be full or blocked */ }
  };
  const sig = JSON.stringify(snapshot);
  if (firstSig.current === null) firstSig.current = sig;

  // Layer 1: this device.
  useEffect(() => {
    const t = window.setTimeout(writeNow, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  useEffect(() => {
    const flush = () => { if (document.visibilityState === "hidden") writeNow(); };
    const now = () => writeNow();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", now);
    window.addEventListener("yebo:draft-save", now);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", now); window.removeEventListener("yebo:draft-save", now); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layer 2: a real draft in Yebo.
  useEffect(() => {
    // Only after something actually changed: opening a draft must not rewrite it.
    if (!canSave || busy || !ready.current || sig === firstSig.current) return;
    const t = window.setTimeout(async () => {
      if (saving.current) return;
      saving.current = true;
      try {
        const res = await quietSaveDraft(payload.current(), snap.current.serverId ?? documentId ?? null);
        if (res.ok) {
          if (res.id !== (snap.current.serverId ?? documentId)) onSaved(res.id);
          if (res.client) onClientCreated(res.client);
          setSavedAt(Date.now());
        } else if (res.error.startsWith("Only drafts")) {
          onSaved(""); // that draft was already sent from somewhere else: the next save starts a new one
        }
      } catch { /* offline or signed out: the copy on this device is still there */ }
      finally { saving.current = false; }
    }, 5000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, canSave, busy]);

  const time = savedAt ? new Date(savedAt).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {restored && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lime/30 p-3 text-sm text-ink">
          <span><b>Welcome back.</b> We kept what you were typing.</span>
          <button type="button" className="min-h-10 rounded-full border border-ink/25 px-4 text-xs font-bold" onClick={() => { clearStoredDraft(draftKey); window.location.reload(); }}>Start fresh</button>
        </div>
      )}
      {savedAt && <p className="text-xs text-ink/50">Saved to your drafts at {time}. You can leave and come back.</p>}
    </div>
  );
}
