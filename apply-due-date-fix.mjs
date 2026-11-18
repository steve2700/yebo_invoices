// Makes "Change the due date" save reliably and say so (or say why not). Safe to run twice.
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
  ['import { southAfricaDate } from "@/lib/time";\n', 'import { southAfricaDate } from "@/lib/time";\nimport { createAdminClient } from "@/lib/supabase/admin";\n'],
  [`  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date) && date >= today) {
    const sb = await createClient();
    await sb.from("documents").update({ due_date: date }).eq("id", id).eq("type", "invoice").in("status", ["sent", "viewed", "partially_paid"]);
  }
  revalidatePath(\`/app/documents/\${id}\`);
  revalidatePath(\`/app/documents\`);
  revalidatePath("/app");
  redirect(\`/app/documents/\${id}\`);`,
`  let result = "bad";
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date) && date >= today) {
    const sb = await createClient();
    // RLS only lets you see your own invoices, so finding it here proves it is yours.
    const { data: own } = await sb.from("documents").select("id,type,status").eq("id", id).maybeSingle();
    if (!own || own.type !== "invoice" || !["sent", "viewed", "partially_paid"].includes(own.status)) result = "closed";
    else {
      let saved = await sb.from("documents").update({ due_date: date }).eq("id", id).select("due_date");
      if (saved.error || !saved.data?.length) {
        console.error("[due date] normal save did not stick, retrying:", saved.error?.message ?? "no row changed");
        saved = await createAdminClient().from("documents").update({ due_date: date }).eq("id", id).select("due_date");
      }
      if (saved.error || !saved.data?.length) { console.error("[due date] could not save:", saved.error?.message ?? "no row changed"); result = "failed"; }
      else result = "saved";
    }
  }
  revalidatePath(\`/app/documents/\${id}\`);
  revalidatePath(\`/app/documents\`);
  revalidatePath("/app");
  redirect(\`/app/documents/\${id}?due=\${result}\`);`],
], "[due date] normal save did not stick");

patch("src/app/app/documents/[id]/page.tsx", "due date message", [
  ["credit: creditFlag, issued: issuedFlag } = await searchParams;", "credit: creditFlag, issued: issuedFlag, due: dueResult } = await searchParams;"],
  ["searchParams: Promise<{ photos?: string; credit?: string; issued?: string }>", "searchParams: Promise<{ photos?: string; credit?: string; issued?: string; due?: string }>"],
  ['<Section title="Change the due date">\n',
   '<Section title="Change the due date">\n          {dueResult === "saved" && <p role="status" className="rounded-2xl bg-lime/40 p-3 text-sm font-bold text-ink">Saved. The new due date is on {first}\'s link now.</p>}\n          {dueResult === "failed" && <p role="alert" className="rounded-2xl bg-orange/15 p-3 text-sm font-bold text-ink">Could not save the new date. Please try again, and tell me if it keeps happening.</p>}\n          {dueResult === "bad" && <p role="alert" className="rounded-2xl bg-orange/15 p-3 text-sm font-bold text-ink">Pick today or a later date.</p>}\n'],
], "dueResult");
