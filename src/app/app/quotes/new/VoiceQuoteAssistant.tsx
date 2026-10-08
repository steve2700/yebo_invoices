"use client";

import { useEffect, useRef, useState } from "react";
import { formatRand } from "@/lib/money";

export type VoiceQuoteDraft = {
  documentType?: "quote" | "invoice" | null;
  clientName: string | null;
  title: string | null;
  location: string | null;
  description: string | null;
  items: {
    description: string;
    quantity: number;
    amountRand: number | null;
    priceBasis: "line_total" | "unit_rate" | "unknown";
  }[];
};

type Status = "idle" | "requesting" | "recording" | "processing";
type Props = {
  onApply: (draft: VoiceQuoteDraft) => void;
  onBusyChange: (busy: boolean) => void;
  docType?: "quote" | "invoice";
};

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const AUDIO_ACCEPT = "audio/*,.ogg,.oga,.opus,.m4a,.mp3,.wav,.webm,.3gp,.aac";

function isVoiceQuoteDraft(value: unknown): value is VoiceQuoteDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return false;
  return candidate.items.every((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const line = item as Record<string, unknown>;
    return typeof line.description === "string"
      && typeof line.quantity === "number"
      && Number.isFinite(line.quantity)
      && (line.amountRand === null || (typeof line.amountRand === "number" && Number.isFinite(line.amountRand)))
      && (line.priceBasis === "line_total" || line.priceBasis === "unit_rate" || line.priceBasis === "unknown");
  }) && (candidate.clientName === null || typeof candidate.clientName === "string")
    && (candidate.title === null || typeof candidate.title === "string")
    && (candidate.location === null || typeof candidate.location === "string")
    && (candidate.description === null || typeof candidate.description === "string")
    && (candidate.documentType === undefined
      || candidate.documentType === null
      || candidate.documentType === "quote"
      || candidate.documentType === "invoice");
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function fileExtension(mediaType: string) {
  if (mediaType.includes("mp4")) return "m4a";
  if (mediaType.includes("ogg") || mediaType.includes("opus")) return "ogg";
  if (mediaType.includes("mpeg")) return "mp3";
  if (mediaType.includes("wav")) return "wav";
  if (mediaType.includes("aac")) return "aac";
  return "webm";
}

export default function VoiceQuoteAssistant({ onApply, onBusyChange, docType = "quote" }: Props) {
  const noun = docType === "invoice" ? "invoice" : "quote";
  const Noun = docType === "invoice" ? "Invoice" : "Quote";
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<VoiceQuoteDraft | null>(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function changeStatus(next: Status) {
    setStatus(next);
    onBusyChange(next !== "idle");
  }

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function processAudio(file: File) {
    setError("");
    setTranscript("");
    setDraft(null);
    setApplied(false);
    if (!file.size) {
      setError("That audio file is empty. Choose another recording.");
      changeStatus("idle");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError("Voice notes must be 20 MB or smaller. Try a shorter recording.");
      changeStatus("idle");
      return;
    }

    changeStatus("processing");
    try {
      const formData = new FormData();
      formData.set("audio", file, file.name);
      const response = await fetch("/api/voice-quote", { method: "POST", body: formData });
      const result = await response.json().catch(() => null) as {
        error?: unknown;
        transcript?: unknown;
        draft?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(typeof result?.error === "string" ? result.error : `Could not turn that voice note into ${noun === "invoice" ? "an" : "a"} ${noun}.`);
      }
      if (!result || typeof result.transcript !== "string" || !isVoiceQuoteDraft(result.draft)) {
        throw new Error("The voice note could not be understood. Try saying the client, work, quantity and price clearly.");
      }
      setTranscript(result.transcript);
      setDraft(result.draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process that voice note. Please try again.");
    } finally {
      changeStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    setDraft(null);
    setApplied(false);
    setElapsed(0);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Upload a saved voice note instead.");
      return;
    }

    changeStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const supportedType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      const chunks: BlobPart[] = [];
      let recordingFailed = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        recordingFailed = true;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        changeStatus("idle");
        setError("The recording stopped unexpectedly. Try again or upload a voice note.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (recordingFailed) return;
        const mediaType = recorder.mimeType || supportedType || "audio/webm";
        const blob = new Blob(chunks, { type: mediaType });
        void processAudio(new File([blob], `voice-note.${fileExtension(mediaType)}`, { type: mediaType }));
      };
      recorder.start();
      changeStatus("recording");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      changeStatus("idle");
      setError("Allow microphone access to record, or upload a saved WhatsApp voice note.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    changeStatus("processing");
    recorder.stop();
  }

  function applyDraft() {
    if (!draft) return;
    onApply(draft);
    setApplied(true);
  }

  const busy = status !== "idle";
  const spokenTypeMismatch = draft?.documentType && draft.documentType !== docType ? draft.documentType : null;

  return (
    <section aria-labelledby="voice-quote-title" className="mb-5 rounded-[2rem] border border-lime/60 bg-lime/10 p-5 ring-1 ring-ink/5 sm:p-6">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange">Quick start · Voice assistant</p>
          <h2 id="voice-quote-title" className="mt-1 text-lg font-black tracking-tight text-ink">Speak your {noun}</h2>
          <p className="mt-1 text-sm leading-5 text-ink/65">Say the client, the work, quantities and prices. We&apos;ll turn it into an editable draft.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          disabled={status === "requesting" || status === "processing"}
          aria-pressed={status === "recording"}
          onClick={() => status === "recording" ? stopRecording() : void startRecording()}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${status === "recording" ? "bg-orange text-white" : "bg-ink text-lime hover:bg-ink/90"}`}
        >
          {status === "recording" ? (
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-white" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
            </svg>
          )}
          {status === "recording" ? `Stop recording · ${formatDuration(elapsed)}` : status === "requesting" ? "Allow microphone access…" : status === "processing" ? "Transcribing voice note…" : "Record a voice note"}
        </button>
        <label className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold text-ink transition hover:border-ink/30 focus-within:ring-2 focus-within:ring-orange ${busy ? "pointer-events-none opacity-50" : ""}`}>
          Upload WhatsApp voice note
          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void processAudio(file);
            }}
          />
        </label>
      </div>

      <p className="mt-2 text-xs leading-5 text-ink/55">You can also upload an audio note saved from WhatsApp. Check the names and prices before using the draft.</p>

      {status === "requesting" && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink">Waiting for microphone permission…</p>}
      {status === "recording" && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink">Recording · {formatDuration(elapsed)}. Tap stop when you&apos;re done.</p>}
      {status === "processing" && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink">Transcribing audio and building your {noun} draft…</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {draft && (
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Review before applying</p>
              <h3 className="mt-1 font-black text-ink">{Noun} draft detected</h3>
            </div>
            <span className="rounded-full bg-lime/50 px-3 py-1.5 text-xs font-bold text-ink">{draft.items.length} {draft.items.length === 1 ? "item" : "items"}</span>
          </div>

          {spokenTypeMismatch && (
            <p role="note" className="mt-3 rounded-xl bg-orange/10 px-3 py-2 text-xs font-semibold text-ink/80">
              You said &ldquo;{spokenTypeMismatch}&rdquo;, but you&apos;re creating {noun === "invoice" ? "an" : "a"} {noun}. It will be saved as {noun === "invoice" ? "an" : "a"} {noun}.
            </p>
          )}

          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {draft.clientName && <div><dt className="text-xs font-bold text-ink/50">Client</dt><dd className="font-semibold text-ink">{draft.clientName}</dd></div>}
            {draft.title && <div><dt className="text-xs font-bold text-ink/50">Job</dt><dd className="font-semibold text-ink">{draft.title}</dd></div>}
            {draft.location && <div><dt className="text-xs font-bold text-ink/50">Location</dt><dd className="font-semibold text-ink">{draft.location}</dd></div>}
          </dl>
          {draft.description && <p className="mt-3 text-sm leading-5 text-ink/75">{draft.description}</p>}

          <ul className="mt-3 divide-y divide-ink/10 rounded-xl border border-ink/10 px-3">
            {draft.items.map((item, index) => {
              const amount = item.amountRand === null ? "Price not heard" : item.priceBasis === "unit_rate" ? `${formatRand(Math.round(item.amountRand * 100))} per unit` : `${formatRand(Math.round(item.amountRand * 100))} line total`;
              return (
                <li key={`${item.description}-${index}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm">
                  <span className="font-semibold text-ink">{item.description} <span className="font-normal text-ink/55">× {item.quantity.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}</span></span>
                  <span className="shrink-0 text-xs font-bold text-ink/65">{amount}</span>
                </li>
              );
            })}
          </ul>

          <details className="mt-3 rounded-xl bg-paper px-3 py-2">
            <summary className="min-h-8 cursor-pointer py-1 text-xs font-bold text-ink/65">Check the transcript</summary>
            <p className="whitespace-pre-wrap break-words pb-2 text-sm leading-5 text-ink/75">{transcript}</p>
          </details>
          <p className="mt-3 text-xs leading-5 text-ink/55">Amounts are treated as line totals unless the speaker clearly says “per hour”, “per metre” or “each”. Review every field before saving.</p>
          <button type="button" onClick={applyDraft} className="mt-4 min-h-11 w-full rounded-2xl bg-lime px-4 py-3 text-sm font-black text-ink transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
            {applied ? "Apply draft again" : "Use this draft"}
          </button>
          {applied && <p role="status" className="mt-2 text-center text-xs font-semibold text-ink/65">Draft added. Keep editing below, then save when it&apos;s ready.</p>}
        </div>
      )}
    </section>
  );
}
