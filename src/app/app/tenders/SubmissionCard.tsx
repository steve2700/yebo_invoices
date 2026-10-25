import type { TenderInfo } from "@/lib/tender-docs";
import type { VaultCheck } from "@/lib/tenders";

// Which vault document answers which line of the tender's "return with your bid" list.
const VAULT_KEY: [RegExp, VaultCheck["key"]][] = [
  [/^CSD/i, "csd"],
  [/tax compliance/i, "sars"],
  [/B-BBEE/i, "bbbee"],
  [/COIDA/i, "coida"],
];

const row = "flex justify-between gap-4 py-1.5 text-sm";
const dt = "shrink-0 text-ink/60";
const dd = "min-w-0 break-words text-right font-bold text-ink";

// What Yebo read from the tender documents, so the owner can see how to submit without opening them.
export default function SubmissionCard({ info, checks = [] }: { info: TenderInfo; checks?: VaultCheck[] }) {
  const hasAnything = info.submitEmail || info.portalUrl || info.closingText || info.enquiries || info.required.length;
  if (!hasAnything) return null;
  return (
    <section className="mt-4 rounded-2xl border border-yebo/25 bg-white p-4 shadow-sm" aria-label="How to submit">
      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-ink/50">How to submit</p>
      <dl className="mt-1 divide-y divide-ink/5">
        {info.submitEmail && <div className={row}><dt className={dt}>Email the bid to</dt><dd className={dd}>{info.submitEmail}</dd></div>}
        {!info.submitEmail && info.portalUrl && (
          <div className={row}><dt className={dt}>Submit on the portal</dt><dd className={dd}><a href={info.portalUrl} target="_blank" rel="noopener noreferrer" className="text-yebo underline underline-offset-2">{info.portalUrl.replace("https://", "")}</a></dd></div>
        )}
        {info.closingText && <div className={row}><dt className={dt}>Closes</dt><dd className={dd}>{info.closingText}</dd></div>}
        {info.rfqNumber && <div className={row}><dt className={dt}>RFQ number</dt><dd className={dd}>{info.rfqNumber}</dd></div>}
        {info.validityDays && <div className={row}><dt className={dt}>Prices valid for</dt><dd className={dd}>{info.validityDays} days</dd></div>}
        {info.vatBasis && <div className={row}><dt className={dt}>VAT</dt><dd className={dd}>{info.vatBasis === "inclusive" ? "Prices must include VAT" : "Prices exclude VAT (VAT added at the end)"}</dd></div>}
        {info.enquiries && (info.enquiries.name || info.enquiries.phone || info.enquiries.email) && (
          <div className={row}><dt className={dt}>Questions</dt><dd className={dd}>{[info.enquiries.name, info.enquiries.phone, info.enquiries.email].filter(Boolean).join(" · ")}</dd></div>
        )}
      </dl>
      {info.method === "portal" && (
        <p className="mt-2 rounded-xl bg-orange/10 px-3 py-2 text-sm font-semibold text-ink">
          This tender is submitted on a portal, not by email. Finish your prices, download the priced Excel from Yebo, then upload it on the portal with the documents below.
        </p>
      )}
      {info.priceNotes.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-ink/80">{info.priceNotes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {info.required.length > 0 && (() => {
        const items = info.required.map((text) => {
          const key = VAULT_KEY.find(([re]) => re.test(text))?.[1];
          const check = key ? checks.find((c) => c.key === key) : undefined;
          return { text, check };
        });
        const inVault = items.filter((i) => i.check);
        const ready = inVault.filter((i) => i.check?.ok).length;
        return (
          <div className="mt-3">
            <p className="text-sm font-extrabold text-ink">Return with your bid{inVault.length > 0 && <span className="ml-2 text-xs font-bold text-ink/60">{ready} of {inVault.length} vault documents ready</span>}</p>
            <ul className="mt-1.5 space-y-1.5">
              {items.map(({ text, check }) => (
                <li key={text} className="flex items-start gap-2 text-sm">
                  <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-black ${check ? (check.ok ? "bg-yebo text-white" : "bg-orange text-white") : "bg-ink/10 text-ink/60"}`}>{check ? (check.ok ? "✓" : "✕") : "•"}</span>
                  <span className="text-ink/80">{text}{check && !check.ok && <span className="block text-xs font-semibold text-ink">{check.detail}. <a href="/app/tenders/vault" className="text-yebo underline underline-offset-2">Fix in the vault</a></span>}{!check && <span className="block text-xs text-ink/50">Gather this yourself</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
      <p className="mt-2 text-xs text-ink/50">Read from the tender documents. Check it against the original before you send.</p>
    </section>
  );
}
