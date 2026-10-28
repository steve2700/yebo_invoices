"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendEmail } from "@/lib/email";
import { SUPPORT } from "@/lib/support";
import { SURVEY, cleanSource, validateAnswers, type SurveyAnswers } from "@/lib/survey";

function answerEmail(answers: SurveyAnswers, source: string | null): string {
  const rows = SURVEY.filter((q) => answers[q.id] !== undefined)
    .map((q) => {
      const a = answers[q.id];
      const text = Array.isArray(a) ? a.join(", ") : a;
      return `<tr><td style="padding:8px 12px 8px 0;color:#555;vertical-align:top">${escapeHtml(q.text)}</td><td style="padding:8px 0;font-weight:bold;vertical-align:top">${escapeHtml(text)}</td></tr>`;
    })
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><p>A new survey answer came in${source ? ` from <b>${escapeHtml(source)}</b>` : ""}.</p><table style="border-collapse:collapse">${rows}</table></div>`;
}

export async function submitSurvey(answers: unknown, source: unknown): Promise<{ ok: boolean }> {
  const clean = validateAnswers(answers);
  if (!clean) return { ok: false };
  const src = cleanSource(source);
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("survey_responses").insert({ answers: clean, source: src });
    if (error) {
      console.error("[survey] insert failed:", error.message);
      return { ok: false };
    }
  } catch (e) {
    console.error("[survey] error:", e);
    return { ok: false };
  }
  // The answer is already saved. If this email fails, the person still sees "Thank you".
  const to = process.env.SURVEY_NOTIFY_EMAIL || SUPPORT.email;
  await sendEmail({ to, subject: `Survey: ${String(clean.pay)} | pays ${String(clean.price)}`, html: answerEmail(clean, src), fromName: "Yebo survey" });
  return { ok: true };
}
