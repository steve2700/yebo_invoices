// The quick buttons (Today, In 2 days, In 5 days) were not passing their choice to the server. Each now carries it in a hidden field.
// Safe to run twice.
import fs from "node:fs";
const file = "src/app/app/documents/[id]/page.tsx";
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let t = raw.replace(/\r\n/g, "\n");
if (t.includes('[["0", "Today"]')) { console.log("already  quick buttons"); process.exit(0); }
const from = `            <form action={changeDueDate} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={d.id} />
              <button name="days" value="0" className={btnOutline}>Today</button>
              <button name="days" value="2" className={btnOutline}>In 2 days</button>
              <button name="days" value="5" className={btnOutline}>In 5 days</button>
            </form>
`;
const to = `            <div className="flex flex-wrap items-center gap-2">
              {[["0", "Today"], ["2", "In 2 days"], ["5", "In 5 days"]].map(([n, label]) => (
                <form key={n} action={changeDueDate}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="days" value={n} />
                  <SubmitButton pendingLabel="Saving…" className={btnOutline}>{label}</SubmitButton>
                </form>
              ))}
            </div>
`;
if (!t.includes(from)) { console.log("MISSING  quick buttons (send me src/app/app/documents/[id]/page.tsx)"); process.exit(1); }
t = t.replace(from, to);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
console.log("done     quick buttons");
