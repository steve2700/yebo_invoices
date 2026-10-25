"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";

export const DECLINE_REASONS: Record<string, string> = {
  price: "The price is too high",
  other: "I went with someone else",
  changes: "I need some changes",
  later: "Not needed any more",
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  color: string;
  fg: string;
  total: string;
  businessName: string;
  /** WhatsApp link to ask the business a question, or null when there is no phone number. */
  askHref: string | null;
  optionLabels?: Record<string, string>;
  barClass: string;
};

function Submit({ name, value, children, style, className }: { name: string; value: string; children: React.ReactNode; style?: React.CSSProperties; className: string }) {
  const { pending } = useFormStatus();
  return <button name={name} value={value} disabled={pending} style={style} className={`${className} disabled:opacity-60`}>{pending ? "Sending…" : children}</button>;
}

// Accept and Decline for a quote. Both ask once before anything is sent, because an answer cannot be taken back,
// and a decline asks for a reason so the business can offer what would change the answer.
export default function AnswerBar({ action, color, fg, total, businessName, askHref, optionLabels = {}, barClass }: Props) {
  const [open, setOpen] = useState<null | "accept" | "decline">(null);
  const [reason, setReason] = useState("");
  const [option, setOption] = useState("");

  function show(kind: "accept" | "decline") {
    const picked = document.querySelector<HTMLInputElement>('input[name="option"]:checked')?.value ?? "";
    setOption(picked);
    setOpen(kind);
  }

  return (
    <>
      <div className={barClass}>
        <button type="button" onClick={() => show("accept")} className="min-h-12 flex-1 rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Accept quote</button>
        <button type="button" onClick={() => show("decline")} className="min-h-12 rounded-2xl border border-black/15 px-4 text-sm font-bold">Decline</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={open === "accept" ? "Confirm accepting the quote" : "Decline the quote"} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <form id="answer-form" action={action} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
            {open === "accept" ? (
              <>
                <p className="text-xl font-black">Accept this quote?</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  You are saying yes to <b>{total}</b>{option && optionLabels[option] ? <> ({optionLabels[option]} option)</> : null}. {businessName} will be told straight away and will contact you about the next steps.
                </p>
                <input type="hidden" name="option" value={option} />
                <div className="mt-5 flex flex-col gap-2">
                  <Submit name="event" value="accepted" className="min-h-12 rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Yes, accept</Submit>
                  <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink/70">Go back</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xl font-black">Decline this quote?</p>
                <p className="mt-2 text-sm text-ink/70">Tell {businessName} why, if you like. They may be able to change the quote for you.</p>
                <fieldset className="mt-3 grid gap-2">
                  <legend className="sr-only">Reason for declining</legend>
                  {Object.entries(DECLINE_REASONS).map(([key, text]) => (
                    <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-semibold ${reason === key ? "border-ink/50 bg-ink/5" : "border-ink/15"}`}>
                      <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="size-4" style={{ accentColor: color }} />
                      {text}
                    </label>
                  ))}
                </fieldset>
                <div className="mt-5 flex flex-col gap-2">
                  {askHref && <a href={askHref} target="_blank" rel="noopener noreferrer" className="grid min-h-12 place-items-center rounded-2xl text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Ask {businessName} a question instead</a>}
                  <Submit name="event" value="declined" className="min-h-12 rounded-2xl border border-black/15 px-4 text-sm font-bold">Decline quote</Submit>
                  <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink/70">Go back</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
