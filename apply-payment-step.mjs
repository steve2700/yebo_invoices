// Payment-step conversion changes. Safe to run twice. Run from the repo root after unzipping.
import fs from "node:fs";

function patch(file, steps) {
  if (!fs.existsSync(file)) { console.error(`MISSING ${file} - send me ${file}`); process.exit(1); }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { marker, from, to, label } of steps) {
    if (s.includes(marker)) { console.log(`  already: ${label}`); continue; }
    if (!s.includes(from)) { console.error(`MISSING anchor "${label}" in ${file} - send me ${file}`); process.exit(1); }
    s = s.replace(from, to); changed = true; console.log(`  done: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
}

console.log("PlanGrid");
patch("src/components/PlanGrid.tsx", [
  {
    label: "start-here flag and button colours", marker: "const startHere",
    from: `        const btn = plan.recommended
          ? "bg-yebo text-white hover:bg-yebo-deep"
          : "border-2 border-yebo-deep/25 text-yebo-deep hover:bg-yebo-chalk";`,
    to: `        // Someone choosing a plan for the first time is led to the cheapest way in. Everyone else keeps the usual recommendation.
        const startHere = mode === "subscribe" && !currentPlan && id === "side";
        const filled = mode === "subscribe" && !currentPlan ? startHere : Boolean(plan.recommended);
        const btn = filled
          ? "bg-yebo text-white hover:bg-yebo-deep"
          : "border-2 border-yebo-deep/25 text-yebo-deep hover:bg-yebo-chalk";`,
  },
  {
    label: "stop pushing the R199 card first on phones", marker: "ring-2 ring-yebo shadow-md",
    from: `\${plan.recommended ? "order-first ring-2 ring-yebo lg:order-none" : "ring-1 ring-yebo-deep/15"}`,
    to: `\${startHere ? "ring-2 ring-yebo shadow-md" : plan.recommended ? "ring-2 ring-yebo" : "ring-1 ring-yebo-deep/15"}`,
  },
  {
    label: "start-here badge", marker: "Easiest start",
    from: `              {plan.recommended && <span className="rounded bg-yebo-sun px-2 py-0.5 text-xs font-bold text-yebo-deep">Most picked</span>}`,
    to: `              {startHere && <span className="rounded bg-lime px-2 py-0.5 text-xs font-bold text-ink">Easiest start</span>}
              {plan.recommended && <span className="rounded bg-yebo-sun px-2 py-0.5 text-xs font-bold text-yebo-deep">Most picked</span>}`,
  },
  {
    label: "button wording", marker: "Start for \${priceLabel(id)} a month",
    from: `{isCurrent ? \`Keep \${plan.name} (\${priceLabel(id)} a month)\` : currentPlan ? \`Switch to \${plan.name}\` : \`Subscribe for \${priceLabel(id)} a month\`}
                  </SubmitButton>`,
    to: `{isCurrent ? \`Keep \${plan.name} (\${priceLabel(id)} a month)\` : currentPlan ? \`Switch to \${plan.name}\` : startHere ? \`Start for \${priceLabel(id)} a month\` : \`Subscribe for \${priceLabel(id)} a month\`}
                  </SubmitButton>
                  <p className="mt-2 text-center text-xs font-semibold text-yebo-deep/60">Cancel or change plan any time</p>`,
  },
]);

console.log("Subscribe page");
patch("src/app/app/subscribe/page.tsx", [
  {
    label: "imports", marker: "PaymentReassure",
    from: `import PlanGrid from "@/components/PlanGrid";`,
    to: `import PlanGrid from "@/components/PlanGrid";
import PaymentReassure from "@/components/PaymentReassure";
import StickyStart from "@/components/StickyStart";`,
  },
  {
    label: "headline", marker: "Start with R49",
    from: `<h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.05em] text-ink sm:text-5xl">Pick the one that matches your business.</h1>`,
    to: `<h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.05em] text-ink sm:text-5xl">{onboarding && !active ? "Start with R49. Move up only if you grow." : "Pick the one that matches your business."}</h1>`,
  },
  {
    label: "reassurance pills under the intro", marker: "Paid days carry over",
    from: `You pay securely through our payment partner, and Yebo never sees your card details.</p>
      </header>`,
    to: `You pay securely through our payment partner, and Yebo never sees your card details.</p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-yebo-deep">
          {["Cancel any time", "Change plan any time", "Paid days carry over", "Secure Paystack payment"].map((t) => (
            <li key={t}><span className="inline-flex items-center gap-1.5 rounded-full bg-lime/40 px-3 py-1.5"><span aria-hidden="true">✓</span>{t}</span></li>
          ))}
        </ul>
      </header>`,
  },
  {
    label: "full reassurance block and sticky bar", marker: "<PaymentReassure",
    from: `      <EftSection />`,
    to: `      <PaymentReassure onboarding={Boolean(onboarding) && !active} />

      <EftSection />`,
  },
  {
    label: "sticky start bar", marker: "<StickyStart",
    from: `    </main>
  );
}`,
    to: `      {!active && paymentsReady && (
        <>
          <div className="h-24 lg:hidden" aria-hidden="true" />
          <StickyStart onboarding={Boolean(onboarding)} />
        </>
      )}
    </main>
  );
}`,
  },
]);

console.log("Admin menu");
patch("src/app/admin/layout.tsx", [
  {
    label: "menu item", marker: "/admin/stuck",
    from: `    { href: "/admin/payments", label: "Payments to sort" },`,
    to: `    { href: "/admin/stuck", label: "Stuck at payment" },
    { href: "/admin/payments", label: "Payments to sort" },`,
  },
]);
console.log("Done. Now: pnpm build");
