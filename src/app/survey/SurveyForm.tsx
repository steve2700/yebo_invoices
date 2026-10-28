"use client";

import Link from "next/link";
import { useState } from "react";
import { SURVEY, isShown, type SurveyAnswers } from "@/lib/survey";
import { submitSurvey } from "./actions";

export default function SurveyForm({ source }: { source: string | null }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [state, setState] = useState<"asking" | "sending" | "done" | "error">("asking");

  const visible = SURVEY.filter((item) => isShown(item, answers));
  const total = visible.length;
  const q = visible[Math.min(step, visible.length - 1)];

  async function finish(final: SurveyAnswers) {
    setState("sending");
    const res = await submitSurvey(final, source);
    setState(res.ok ? "done" : "error");
  }

  function next(final: SurveyAnswers) {
    const remaining = SURVEY.filter((item) => isShown(item, final));
    if (step + 1 >= remaining.length) void finish(final);
    else setStep(step + 1);
  }

  function pickOne(option: string) {
    const final = { ...answers, [q.id]: option };
    setAnswers(final);
    next(final);
  }

  function toggle(option: string) {
    const current = (answers[q.id] as string[] | undefined) ?? [];
    let updated: string[];
    if (current.includes(option)) updated = current.filter((o) => o !== option);
    else if (current.length >= (q.max ?? 2)) updated = [...current.slice(1), option];
    else updated = [...current, option];
    setAnswers({ ...answers, [q.id]: updated });
  }

  if (state === "done") {
    return (
      <div role="status">
        <h1 className="text-3xl font-black tracking-tight text-yebo-deep">Thank you</h1>
        <p className="mt-3 text-lg leading-8 text-ink/75">Your answers are saved. They help decide what Yebo Invoices builds next.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/how-it-works" className="inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-base font-bold text-white hover:bg-yebo-deep">See how Yebo works</Link>
          <Link href="/pricing" className="inline-flex min-h-12 items-center rounded-xl border-2 border-yebo-deep/20 px-6 text-base font-bold text-yebo-deep hover:border-yebo-deep/50">See plans</Link>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div role="alert">
        <h1 className="text-2xl font-black tracking-tight text-yebo-deep">That did not save</h1>
        <p className="mt-3 text-lg leading-8 text-ink/75">Something went wrong on our side. Your answers are still here.</p>
        <button type="button" onClick={() => void finish(answers)} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-yebo px-6 text-base font-bold text-white hover:bg-yebo-deep">Try again</button>
      </div>
    );
  }

  const chosen = answers[q.id];
  const chosenMany = Array.isArray(chosen) ? chosen : [];
  const busy = state === "sending";

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink/60">
        <span>Question {step + 1} of {total}</span>
        {step > 0 && (
          <button type="button" disabled={busy} onClick={() => setStep(step - 1)} className="min-h-11 px-1 text-yebo underline decoration-yebo/30 underline-offset-4">Back</button>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-yebo-deep/10" aria-hidden="true">
        <div className="h-full rounded-full bg-yebo transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      <h1 className="mt-8 text-2xl font-black leading-tight tracking-tight text-yebo-deep sm:text-3xl">{q.text}</h1>

      <div className="mt-6 grid gap-3" role={q.kind === "one" ? "radiogroup" : "group"} aria-label={q.text}>
        {q.options.map((o) => {
          const on = q.kind === "one" ? chosen === o : chosenMany.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={busy}
              role={q.kind === "one" ? "radio" : "checkbox"}
              aria-checked={on}
              onClick={() => (q.kind === "one" ? pickOne(o) : toggle(o))}
              className={`min-h-14 rounded-xl border-2 px-5 py-3 text-left text-base font-semibold transition ${on ? "border-yebo bg-yebo text-white" : "border-yebo-deep/15 bg-white text-yebo-deep hover:border-yebo/60"}`}
            >
              {o}
            </button>
          );
        })}
      </div>

      {q.kind === "many" && (
        <button
          type="button"
          disabled={busy || chosenMany.length === 0}
          onClick={() => next(answers)}
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-yebo-deep px-7 text-base font-bold text-white transition hover:bg-yebo disabled:opacity-40"
        >
          {step + 1 >= total ? "Send" : "Next"}
        </button>
      )}
      {busy && <p className="mt-4 text-sm font-semibold text-ink/60">Saving your answers…</p>}
    </div>
  );
}
