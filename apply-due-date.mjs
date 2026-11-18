// Adds "Change the due date" to an unpaid invoice's page. Safe to run twice.
import fs from "node:fs";
const log = (s, l) => console.log(s.padEnd(8), l);
function patch(file, label, edits, marker) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let t = raw.replace(/\r\n/g, "\n");
  if (t.includes(marker)) return log("already", label);
  for (const [from, to] of edits) {
    if (!t.includes(from)) return log("MISSING", `${label} (send me ${file})`);
    t = t.replace(from, to);
  }
  fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
  log("done", label);
}

patch("src/app/app/documents/revise-actions.ts", "due date action", [
  ['import { addDays } from "@/lib/dates";\n', 'import { addDays } from "@/lib/dates";\nimport { southAfricaDate } from "@/lib/time";\n'],
  ["// The client asked \"I still want this\" on an expired quote",
`// Moves the due date of an unpaid invoice. Either a quick choice (days from today) or a date picked on the calendar.
export async function changeDueDate(fd: FormData) {
  const id = fd.get("id");
  if (!idOk(id)) return;
  const today = southAfricaDate();
  const days = String(fd.get("days") ?? "");
  let date = String(fd.get("date") ?? "");
  if (/^\\d{1,3}$/.test(days)) {
    const base = new Date(today + "T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + Number(days));
    date = base.toISOString().slice(0, 10);
  }
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date) && date >= today) {
    const sb = await createClient();
    await sb.from("documents").update({ due_date: date }).eq("id", id).eq("type", "invoice").in("status", ["sent", "viewed", "partially_paid"]);
  }
  revalidatePath(\`/app/documents/\${id}\`);
  revalidatePath(\`/app/documents\`);
  revalidatePath("/app");
  redirect(\`/app/documents/\${id}\`);
}

// The client asked "I still want this" on an expired quote`],
], "export async function changeDueDate");

patch("src/app/app/documents/[id]/page.tsx", "due date card", [
  ['import { extendQuote, reviseQuote } from "../revise-actions";', 'import { changeDueDate, extendQuote, reviseQuote } from "../revise-actions";'],
  ["      {/* ---------- 3. WHAT TO DO NEXT ---------- */}\n",
`      {!isQuote && ["sent", "viewed", "partially_paid"].includes(d.status) && balanceDue > 0 && (
        <Section title="Change the due date">
          <ActionCard icon="📅" title={d.due_date ? \`Due \${formatDate(d.due_date)}\` : "No due date yet"} description={\`Want it paid sooner? Pick a new date. \${first}'s invoice link updates straight away, nothing needs to be sent again.\`}>
            <form action={changeDueDate} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={d.id} />
              <button name="days" value="0" className={btnOutline}>Today</button>
              <button name="days" value="2" className={btnOutline}>In 2 days</button>
              <button name="days" value="5" className={btnOutline}>In 5 days</button>
            </form>
            <form action={changeDueDate} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={d.id} />
              <input type="date" name="date" min={today} required defaultValue={d.due_date ?? undefined} className="min-h-11 rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-bold text-ink" />
              <SubmitButton pendingLabel="Saving…" className={btnOutline}>Save date</SubmitButton>
            </form>
          </ActionCard>
        </Section>
      )}

      {/* ---------- 3. WHAT TO DO NEXT ---------- */}
`],
], "changeDueDate, extendQuote");
