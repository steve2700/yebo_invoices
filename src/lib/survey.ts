// The survey questions. Every answer is a tap. The server checks each answer against this list, so the page can never save text.
export type SurveyQuestion = {
  id: string;
  text: string;
  kind: "one" | "many";
  max?: number; // for "many"
  options: string[];
  // Only ask this question when an earlier "many" or "one" answer includes this option.
  showIf?: { id: string; includes: string };
};

const AI = "ChatGPT or another AI";

export const SURVEY: SurveyQuestion[] = [
  { id: "progress", text: "Be honest: right now, is your business growing, stuck or going backwards?", kind: "one", options: ["Growing", "Stuck", "Going backwards"] },
  { id: "problem", text: "If it is not growing, where is the real problem?", kind: "one", options: ["Not enough people asking for quotes", "Quotes that never turn into jobs", "Getting paid after the job", "Too much of my time goes on admin", "It is growing fine"] },
  { id: "unanswered", text: "Last month, how many quotes did you send and never hear back about?", kind: "one", options: ["None", "1 to 3", "4 to 10", "More than 10", "I have no idea"] },
  { id: "forgot", text: "How many jobs have you lost because you forgot to follow up?", kind: "one", options: ["None that I know of", "One or two", "A few", "More than I want to admit"] },
  { id: "want", text: "What do you want most for your business in the next 12 months?", kind: "one", options: ["More jobs coming in", "A steady, predictable income", "Getting paid on time", "More free time", "To hire help or grow a team", "Bigger clients or tenders"] },
  { id: "trade", text: "What kind of work do you do?", kind: "one", options: ["Electrician", "Plumber", "Builder or construction", "Solar installer", "Painter or tiler", "Something else"] },
  { id: "volume", text: "How many quotes do you send in a normal month?", kind: "one", options: ["1 to 5", "6 to 20", "21 to 50", "More than 50"] },
  { id: "source", text: "Where do most of your customers come from?", kind: "one", options: ["Word of mouth", "Facebook or WhatsApp groups", "Google search", "Gumtree or Marketplace", "Repeat clients", "Something else"] },
  { id: "method", text: "How do you make quotes and invoices today? Pick up to two.", kind: "many", max: 2, options: ["Word or Excel", AI, "An invoicing app", "By hand", "A WhatsApp message", "Something else"] },
  { id: "ai_why", text: "Why do you use ChatGPT or AI for quotes? Pick up to two.", kind: "many", max: 2, showIf: { id: "method", includes: AI }, options: ["It is quick", "It is free", "It words things well", "It is easy to use", "I did not know about anything better"] },
  { id: "ai_problem", text: "What goes wrong when you use AI for quotes? Pick up to two.", kind: "many", max: 2, showIf: { id: "method", includes: AI }, options: ["I cannot track what I sent", "I forget to follow up", "Nothing adds up my totals", "Files are all over the place", "The numbers or wording need fixing", "Nothing goes wrong"] },
  { id: "lost", text: "What loses you the most quotes? Pick up to two.", kind: "many", max: 2, options: ["The client goes quiet", "My price is too high", "I reply too slowly", "My quote looks unprofessional", "The client picks someone else", "I forget to follow up"] },
  { id: "owed", text: "Do you know how much money clients owe you right now?", kind: "one", options: ["Yes, exactly", "Roughly", "No"] },
  { id: "help", text: "What would help you most? Pick up to two.", kind: "many", max: 2, options: ["One list of every quote and invoice", "A list of clients to follow up", "Clients paying online", "Speaking a quote instead of typing", "Seeing money in and money owed", "Sending on WhatsApp in one tap"] },
  { id: "try", text: "Would you try Yebo Invoices on your real quotes for a month, to see if you win more of them?", kind: "one", options: ["Yes, this week", "Yes, sometime", "Maybe", "No"] },
  { id: "pay", text: "Would you pay for Yebo Invoices?", kind: "one", options: ["Yes, definitely", "Probably", "Not sure", "Probably not", "No"] },
  { id: "price", text: "What would you pay a month for it?", kind: "one", options: ["Under R50", "R50 to R99", "R100 to R199", "R200 to R499", "R500 or more", "I would not pay"] },
];

export type SurveyAnswers = Record<string, string | string[]>;

export function isShown(q: SurveyQuestion, answers: SurveyAnswers): boolean {
  if (!q.showIf) return true;
  const a = answers[q.showIf.id];
  return Array.isArray(a) ? a.includes(q.showIf.includes) : a === q.showIf.includes;
}

// Returns clean answers, or null if a question that applies is missing or has an answer that is not listed.
// Answers to questions that do not apply are dropped.
export function validateAnswers(input: unknown): SurveyAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const out: SurveyAnswers = {};
  for (const q of SURVEY) {
    if (!isShown(q, out)) continue;
    const v = raw[q.id];
    if (q.kind === "one") {
      if (typeof v !== "string" || !q.options.includes(v)) return null;
      out[q.id] = v;
    } else {
      if (!Array.isArray(v) || v.length < 1 || v.length > (q.max ?? 2)) return null;
      if (!v.every((x) => typeof x === "string" && q.options.includes(x))) return null;
      out[q.id] = Array.from(new Set(v as string[]));
    }
  }
  return out;
}

// A short label for where the link was shared, from ?s=facebook. Letters, numbers and dashes only.
export function cleanSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
  return s || null;
}
