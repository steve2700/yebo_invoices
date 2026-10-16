"use client";

import { useEffect, useRef, useState } from "react";
import { formatRand } from "@/lib/money";

export type VoiceDraftItem = {
  description: string;
  quantity: number;
  amountRand: number | null;
  priceBasis: "line_total" | "unit_rate" | "unknown";
  priceUncertain?: boolean;
  alternativeAmountRand?: number | null;
};

export type VoiceQuoteDraft = {
  documentType?: "quote" | "invoice" | null;
  clientName: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  title: string | null;
  location: string | null;
  description: string | null;
  items: VoiceDraftItem[];
};

export type ApplyMode = "replace" | "append";

type Status = "idle" | "requesting" | "recording" | "processing";
type Props = {
  onApply: (draft: VoiceQuoteDraft, mode: ApplyMode) => void;
  onBusyChange: (busy: boolean) => void;
  docType?: "quote" | "invoice";
  hasExistingItems?: boolean;
  voiceLeft?: number | null; // how many voice quotes the plan still allows this month (null = no limit)
};

// What the owner is editing in the review card. Numbers are kept as text while typing.
type EditItem = { description: string; quantity: string; amount: string; basis: "unit_rate" | "line_total"; uncertain: boolean; alternative: number | null };
type EditDraft = { clientName: string; clientPhone: string; clientEmail: string; title: string; location: string; description: string; items: EditItem[] };

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 120;
const QUIET_LEVEL = 0.02; // below this the microphone barely heard anything
const AUDIO_ACCEPT = "audio/*,.ogg,.oga,.opus,.m4a,.mp3,.wav,.webm,.3gp,.aac";

const inputClass = "mt-1 w-full rounded-lg border border-ink/15 bg-white px-2.5 py-2 text-sm text-ink outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15";
const labelClass = "block text-[11px] font-bold uppercase tracking-[0.1em] text-ink/50";

function isVoiceQuoteDraft(value: unknown): value is VoiceQuoteDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return false;
  const optionalText = (field: unknown) => field === undefined || field === null || typeof field === "string";
  return candidate.items.every((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const line = item as Record<string, unknown>;
    return typeof line.description === "string"
      && typeof line.quantity === "number"
      && Number.isFinite(line.quantity)
      && (line.amountRand === null || (typeof line.amountRand === "number" && Number.isFinite(line.amountRand)))
      && (line.priceBasis === "line_total" || line.priceBasis === "unit_rate" || line.priceBasis === "unknown");
  })
    && optionalText(candidate.clientName) && optionalText(candidate.clientPhone) && optionalText(candidate.clientEmail)
    && optionalText(candidate.title) && optionalText(candidate.location) && optionalText(candidate.description)
    && (candidate.documentType === undefined || candidate.documentType === null || candidate.documentType === "quote" || candidate.documentType === "invoice");
}

function toEdit(draft: VoiceQuoteDraft): EditDraft {
  return {
    clientName: draft.clientName ?? "",
    clientPhone: draft.clientPhone ?? "",
    clientEmail: draft.clientEmail ?? "",
    title: draft.title ?? "",
    location: draft.location ?? "",
    description: draft.description ?? "",
    items: draft.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      amount: item.amountRand === null ? "" : String(item.amountRand),
      basis: item.amountRand !== null && item.priceBasis !== "unit_rate" ? "line_total" : "unit_rate",
      uncertain: Boolean(item.priceUncertain),
      alternative: item.alternativeAmountRand ?? null,
    })),
  };
}

function fromEdit(edit: EditDraft): VoiceQuoteDraft {
  const clean = (value: string) => value.trim() || null;
  return {
    clientName: clean(edit.clientName),
    clientPhone: clean(edit.clientPhone),
    clientEmail: clean(edit.clientEmail),
    title: clean(edit.title),
    location: clean(edit.location),
    description: clean(edit.description),
    items: edit.items
      .filter((item) => item.description.trim())
      .map((item) => {
        const quantity = Number(item.quantity.replace(/[^\d.]/g, ""));
        const amount = item.amount.trim() === "" ? null : Number(item.amount.replace(/[^\d.]/g, ""));
        return {
          description: item.description.trim(),
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          amountRand: amount !== null && Number.isFinite(amount) ? amount : null,
          priceBasis: amount === null ? ("unknown" as const) : item.basis,
        };
      }),
  };
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

export default function VoiceQuoteAssistant({ onApply, onBusyChange, docType = "quote", hasExistingItems = false, voiceLeft = null }: Props) {
  const noun = docType === "invoice" ? "invoice" : "quote";
  const Noun = docType === "invoice" ? "Invoice" : "Quote";
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<ApplyMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const peakRef = useRef(0);
  const reviewRef = useRef<HTMLDivElement>(null);

  function changeStatus(next: Status) {
    setStatus(next);
    onBusyChange(next !== "idle");
  }

  function stopMeter() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setLevel(0);
  }

  // A live microphone meter, so the owner can see straight away that they are being heard.
  function startMeter(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += ((value - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        peakRef.current = Math.max(peakRef.current, rms);
        setLevel(Math.min(1, rms * 4));
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // The meter is a nice extra. Recording works without it.
    }
  }

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === "recording" && elapsed >= MAX_RECORDING_SECONDS) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, status]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    void audioContextRef.current?.close().catch(() => undefined);
  }, []);

  function showDraft(nextTranscript: string, draft: VoiceQuoteDraft) {
    setTranscript(nextTranscript);
    setEdit(toEdit(draft));
    setApplied(null);
    window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function readResult(response: Response) {
    const result = await response.json().catch(() => null) as { error?: unknown; transcript?: unknown; draft?: unknown } | null;
    if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : `Could not turn that into ${noun === "invoice" ? "an" : "a"} ${noun}.`);
    if (!result || typeof result.transcript !== "string" || !isVoiceQuoteDraft(result.draft)) {
      throw new Error("We could not understand that. Try saying the client, the work, the quantity and the price clearly.");
    }
    return { transcript: result.transcript, draft: result.draft };
  }

  async function processAudio(file: File) {
    setError("");
    setTranscript("");
    setEdit(null);
    setApplied(null);
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
      const { transcript: heard, draft } = await readResult(await fetch("/api/voice-quote", { method: "POST", body: formData }));
      showDraft(heard, draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process that voice note. Please try again.");
    } finally {
      changeStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // The owner fixed a misheard word (a name, a price) and wants the draft rebuilt from their corrected text.
  async function rebuildFromText() {
    if (rebuilding || transcript.trim().length < 5) return;
    setRebuilding(true);
    setError("");
    try {
      const { transcript: fixed, draft } = await readResult(
        await fetch("/api/voice-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) }),
      );
      showDraft(fixed, draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rebuild the draft. Please try again.");
    } finally {
      setRebuilding(false);
    }
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    setEdit(null);
    setApplied(null);
    setElapsed(0);
    peakRef.current = 0;
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
      const supportedType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
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
        stopMeter();
        changeStatus("idle");
        setError("The recording stopped unexpectedly. Try again or upload a voice note.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        stopMeter();
        if (recordingFailed) return;
        // If the microphone barely heard anything, say so now instead of sending silence off to be transcribed.
        if (peakRef.current > 0 && peakRef.current < QUIET_LEVEL) {
          changeStatus("idle");
          setError("We could barely hear you. Hold your phone a little closer, speak up, and try again.");
          return;
        }
        const mediaType = recorder.mimeType || supportedType || "audio/webm";
        const blob = new Blob(chunks, { type: mediaType });
        void processAudio(new File([blob], `voice-note.${fileExtension(mediaType)}`, { type: mediaType }));
      };
      recorder.start();
      startMeter(stream);
      changeStatus("recording");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      stopMeter();
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

  function apply(mode: ApplyMode) {
    if (!edit) return;
    const draft = fromEdit(edit);
    if (!draft.items.length) {
      setError("Add at least one item with a name before using the draft.");
      return;
    }
    setError("");
    onApply(draft, mode);
    setApplied(mode);
  }

  function updateItem(index: number, patch: Partial<EditItem>) {
    setEdit((current) => current && { ...current, items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)) });
  }

  const busy = status !== "idle";
  const meterBars = [0.2, 0.4, 0.6, 0.8, 1];

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
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange">Fastest way · Voice assistant</p>
          <h2 id="voice-quote-title" className="mt-1 text-lg font-black tracking-tight text-ink">Speak your {noun}</h2>
          <p className="mt-1 text-sm leading-5 text-ink/65">Say who it is for, the work, the quantities and the prices. Yebo fills in the {noun}, and you check it before anything is used.</p>
        </div>
      </div>

      {voiceLeft !== null && (
        <p className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink/70">
          {voiceLeft > 0 ? `${voiceLeft} voice ${voiceLeft === 1 ? "quote" : "quotes"} left this month` : "No voice quotes left this month. You can still type, or upgrade your plan."}
        </p>
      )}

      {!edit && status !== "recording" && (
        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-ink/75">
          <p className="font-bold text-ink">Say it like this</p>
          <p className="mt-1 italic">&ldquo;Quote for Mr Stewart, 082 123 4567, in Kempton Park. Granite cutting, 3 hours at 450 rand an hour. Delivery, 300 rand.&rdquo;</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-ink/60 marker:text-orange">
            <li>Say the phone number slowly, one digit at a time.</li>
            <li>Say prices in full: &ldquo;one thousand eight hundred rand&rdquo;, not &ldquo;one point eight&rdquo;.</li>
            <li>Say &ldquo;per hour&rdquo; or &ldquo;each&rdquo; when the price is for one unit.</li>
            <li>A short pause between items helps.</li>
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          disabled={status === "requesting" || status === "processing" || voiceLeft === 0}
          aria-pressed={status === "recording"}
          onClick={() => (status === "recording" ? stopRecording() : void startRecording())}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${status === "recording" ? "bg-orange text-white" : "bg-ink text-lime hover:bg-ink/90"}`}
        >
          {status === "recording" ? (
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-white" />
          ) : status === "processing" ? (
            <span aria-hidden="true" className="spin inline-block size-4 rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
            </svg>
          )}
          {status === "recording" ? `Tap to stop · ${formatDuration(elapsed)}` : status === "requesting" ? "Allow microphone access…" : status === "processing" ? "Listening back and filling it in…" : "Record a voice note"}
        </button>
        <label className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm font-bold text-ink transition hover:border-ink/30 focus-within:ring-2 focus-within:ring-orange ${busy || voiceLeft === 0 ? "pointer-events-none opacity-50" : ""}`}>
          Upload WhatsApp voice note
          <input
            ref={fileInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            disabled={busy || voiceLeft === 0}
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void processAudio(file);
            }}
          />
        </label>
      </div>

      {status === "requesting" && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink">Waiting for microphone permission…</p>}
      {status === "recording" && (
        <div role="status" aria-live="polite" className="fade-up mt-3 rounded-xl bg-white/80 px-3 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="soft-pulse size-2.5 rounded-full bg-orange" />
            <p className="text-sm font-semibold text-ink">Listening · {formatDuration(elapsed)}. Speak naturally, then tap stop.</p>
          </div>
          <div aria-hidden="true" className="mt-3 flex h-6 items-end gap-1">
            {meterBars.map((threshold) => (
              <span key={threshold} style={{ height: `${Math.max(18, level >= threshold * 0.8 ? 100 : level * 100)}%` }} className={`w-2 rounded-full transition-all duration-100 ${level >= threshold * 0.5 ? "bg-yebo" : "bg-ink/15"}`} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink/55">If the bars do not move, your microphone cannot hear you.</p>
        </div>
      )}
      {status === "processing" && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink">Transcribing and building your {noun} draft. This takes a few seconds…</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {edit && (
        <div ref={reviewRef} className="fade-up mt-4 scroll-mt-24 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange">Check it, fix anything, then use it</p>
              <h3 className="mt-1 font-black text-ink">{Noun} draft</h3>
            </div>
            <span className="rounded-full bg-lime/50 px-3 py-1.5 text-xs font-bold text-ink">{edit.items.length} {edit.items.length === 1 ? "item" : "items"}</span>
          </div>
          <p className="mt-1 text-xs text-ink/55">Everything below can be edited. It is normal to fix a word or a number.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelClass}>Client name<input value={edit.clientName} onChange={(event) => setEdit({ ...edit, clientName: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Client WhatsApp number<input value={edit.clientPhone} inputMode="tel" placeholder="Not heard. Type it here" onChange={(event) => setEdit({ ...edit, clientPhone: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Job name<input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Location<input value={edit.location} onChange={(event) => setEdit({ ...edit, location: event.target.value })} className={inputClass} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Client email <span className="font-medium normal-case tracking-normal text-ink/40">(optional)</span><input value={edit.clientEmail} inputMode="email" onChange={(event) => setEdit({ ...edit, clientEmail: event.target.value })} className={inputClass} /></label>
            <label className={`${labelClass} sm:col-span-2`}>What you will do<textarea rows={2} value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} className={inputClass} /></label>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {edit.items.map((item, index) => (
              <li key={index} className="rounded-xl border border-ink/10 bg-paper/50 p-3">
                <label className={labelClass}>Item<input value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} className={inputClass} /></label>
                <div className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] items-end gap-2">
                  <label className={labelClass}>Qty<input value={item.quantity} inputMode="decimal" onChange={(event) => updateItem(index, { quantity: event.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Price (R)<input value={item.amount} inputMode="decimal" placeholder="Not heard" onChange={(event) => updateItem(index, { amount: event.target.value, uncertain: false })} className={`${inputClass} ${item.uncertain ? "border-orange ring-2 ring-orange/20" : ""}`} /></label>
                  <label className={labelClass}>Price is
                    <select value={item.basis} onChange={(event) => updateItem(index, { basis: event.target.value as EditItem["basis"] })} className={inputClass}>
                      <option value="unit_rate">for each one</option>
                      <option value="line_total">the total</option>
                    </select>
                  </label>
                </div>
                {item.uncertain && (
                  <div role="alert" className="mt-2 rounded-lg bg-orange/10 p-2.5 text-xs leading-5 text-ink">
                    <p className="font-bold">Please check this price{item.amount ? `: we heard ${formatRand(Math.round(Number(item.amount) * 100))}` : ""}.</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {item.alternative !== null && (
                        <button type="button" onClick={() => updateItem(index, { amount: String(item.alternative), uncertain: false })} className="min-h-9 rounded-lg bg-orange px-3 text-xs font-extrabold text-white">Use {formatRand((item.alternative ?? 0) * 100)}</button>
                      )}
                      <button type="button" onClick={() => updateItem(index, { uncertain: false })} className="min-h-9 rounded-lg border border-ink/20 px-3 text-xs font-bold text-ink">That is right</button>
                    </div>
                  </div>
                )}
                <button type="button" onClick={() => setEdit({ ...edit, items: edit.items.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 min-h-9 text-xs font-semibold text-ink/50 underline underline-offset-2">Remove this item</button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setEdit({ ...edit, items: [...edit.items, { description: "", quantity: "1", amount: "", basis: "unit_rate", uncertain: false, alternative: null }] })} className="mt-3 min-h-10 rounded-full border border-ink/15 px-4 text-xs font-bold text-ink">+ Add an item</button>

          <details className="mt-4 rounded-xl bg-paper px-3 py-2">
            <summary className="min-h-8 cursor-pointer py-1 text-xs font-bold text-ink/65">What we heard. Tap to fix misheard words</summary>
            <p className="mt-1 text-xs text-ink/55">Correct any wrong words, such as a name or a price, then rebuild the draft from your text.</p>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={4} className={`${inputClass} text-sm leading-5`} aria-label="What we heard" />
            <button type="button" disabled={rebuilding} onClick={() => void rebuildFromText()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-xs font-extrabold text-lime disabled:opacity-60">
              {rebuilding && <span aria-hidden="true" className="spin inline-block size-3.5 rounded-full border-2 border-current border-t-transparent" />}
              {rebuilding ? "Rebuilding…" : "Rebuild the draft from this text"}
            </button>
          </details>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {hasExistingItems ? (
              <>
                <button type="button" onClick={() => apply("append")} className="min-h-11 flex-1 rounded-2xl bg-lime px-4 py-3 text-sm font-black text-ink transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">Add these to my items</button>
                <button type="button" onClick={() => apply("replace")} className="min-h-11 flex-1 rounded-2xl border-2 border-ink/15 px-4 py-3 text-sm font-bold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">Replace my items</button>
              </>
            ) : (
              <button type="button" onClick={() => apply("replace")} className="min-h-11 w-full rounded-2xl bg-lime px-4 py-3 text-sm font-black text-ink transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
                {applied ? "Apply again" : "Use this draft"}
              </button>
            )}
          </div>
          {applied && (
            <p role="status" className="pop-in mt-3 rounded-xl bg-lime/30 px-3 py-2 text-center text-sm font-bold text-ink">
              {applied === "append" ? "Added to your items." : "Done. Your details are filled in below."} Check the amounts, then save or send.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
