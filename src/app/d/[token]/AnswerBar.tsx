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

const WAITS: [string, string][] = [["3", "In 3 days"], ["7", "Next week"], ["14", "In 2 weeks"]];

// Accept, Not yet, Ask for a change and No thanks. Accepting asks once before anything is sent, because it cannot be taken back.
// "Not yet" is for the many clients who would rather go quiet than say no: they pick when to be followed up, and that is a promise
// the business can act on. "No thanks" is one tap on a reason, so saying no is as easy as saying nothing.
export default function AnswerBar({ action, color, fg, total, businessName, askHref, optionLabels = {}, barClass }: Props) {
  const [open, setOpen] = useState<null | "accept" | "decline" | "change" | "later">(null);
  const [option, setOption] = useState("");

  function show(kind: "accept" | "decline" | "change" | "later") {
    const picked = document.querySelector<HTMLInputElement>('input[name="option"]:checked')?.value ?? "";
    setOption(picked);
    setOpen(kind);
  }
  const ghost = "min-h-11 flex-1 rounded-2xl border border-black/15 px-3 text-sm font-bold active:scale-[.98]";
  const label = open === "accept" ? "Confirm accepting the quote" : open === "change" ? "Ask for a change" : open === "later" ? "Ask to be reminded later" : "No thanks";

  return (
    <>
      <div className={`${barClass} flex-wrap`}>
        <button type="button" onClick={() => show("accept")} className="min-h-12 basis-full rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Accept quote</button>
        <button type="button" onClick={() => show("later")} className={ghost}>Not yet</button>
        <button type="button" onClick={() => show("change")} className={ghost}>Change something</button>
        <button type="button" onClick={() => show("decline")} className={ghost}>No thanks</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <form id="answer-form" action={action} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
            {open === "accept" ? (
              <>
                <p className="text-xl font-black">Accept this quote?</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  You are saying yes to <b>{total}</b>{option && optionLabels[option] ? <> ({optionLabels[option]} option)</> : null}. Your name and the time are saved as your signature. {businessName} will be told straight away and will contact you about the next steps.
                </p>
                <input type="hidden" name="option" value={option} />
                <label className="mt-4 block text-xs font-bold text-ink/60">Type your full name to sign
                  <input name="signature" required minLength={2} maxLength={80} autoComplete="name" placeholder="Your full name" className="mt-1 w-full rounded-xl border border-ink/20 p-3 text-base font-normal outline-none focus:border-ink/50" />
                </label>
                <div className="mt-5 flex flex-col gap-2">
                  <Submit name="event" value="accepted" className="min-h-12 rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Yes, accept</Submit>
                  <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink/70">Go back</button>
                </div>
              </>
            ) : open === "later" ? (
              <>
                <input type="hidden" name="event" value="snooze" />
                <p className="text-xl font-black">No rush. When should {businessName} check in?</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">Pick a time. We will remind you then, and {businessName} will not chase you before that. The price stays held for you.</p>
                <div className="mt-4 grid gap-2">
                  {WAITS.map(([days, text]) => (
                    <Submit key={days} name="days" value={days} className="min-h-12 rounded-2xl border border-black/15 px-4 text-base font-black active:scale-[.98]">{text}</Submit>
                  ))}
                </div>
                <button type="button" onClick={() => setOpen(null)} className="mt-3 min-h-11 w-full rounded-2xl px-4 text-sm font-bold text-ink/70">Go back</button>
              </>
            ) : open === "change" ? (
              <>
                <p className="text-xl font-black">What would you like changed?</p>
                <p className="mt-2 text-sm text-ink/70">Tell {businessName} in your own words, for example a different quantity, a cheaper option or another date. They will update the quote or get back to you.</p>
                <textarea name="message" required minLength={2} maxLength={600} rows={4} placeholder="Type your message here" className="mt-3 w-full rounded-xl border border-ink/20 p-3 text-base outline-none focus:border-ink/50" />
                <div className="mt-5 flex flex-col gap-2">
                  <Submit name="event" value="change" className="min-h-12 rounded-2xl px-4 text-base font-black active:scale-[.98]" style={{ background: color, color: fg }}>Send to {businessName}</Submit>
                  <button type="button" onClick={() => setOpen(null)} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink/70">Go back</button>
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="event" value="declined" />
                <p className="text-xl font-black">No problem, and thanks for looking.</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">One tap on the reason is all it takes. It helps {businessName} and is never held against you.</p>
                <div className="mt-4 grid gap-2">
                  {Object.entries(DECLINE_REASONS).map(([key, text]) => (
                    <Submit key={key} name="reason" value={key} className="min-h-12 rounded-2xl border border-black/15 px-4 text-left text-sm font-bold active:scale-[.98]">{text}</Submit>
                  ))}
                  <Submit name="reason" value="" className="min-h-11 rounded-2xl px-4 text-sm font-semibold text-ink/65 underline decoration-ink/25 underline-offset-4">Just decline, no reason</Submit>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {askHref && <a href={askHref} target="_blank" rel="noopener noreferrer" className="grid min-h-11 place-items-center rounded-2xl border border-black/15 text-sm font-bold">Ask {businessName} a question instead</a>}
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
