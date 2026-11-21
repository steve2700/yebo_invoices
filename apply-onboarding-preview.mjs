// Shows each new business its own sample quote and greets it by name on the payment step. Safe to run twice.
import fs from "node:fs";
const file = "src/app/app/subscribe/page.tsx";
if (!fs.existsSync(file)) { console.error(`MISSING ${file} - send me ${file}`); process.exit(1); }
const raw = fs.readFileSync(file, "utf8"); const crlf = raw.includes("\r\n"); let s = raw.replace(/\r\n/g, "\n"); let changed = false;
function step(label, marker, from, to) {
  if (s.includes(marker)) return console.log("  already: " + label);
  if (!s.includes(from)) { console.error(`MISSING anchor "${label}" in ${file} - send me ${file}`); process.exit(1); }
  s = s.replace(from, to); changed = true; console.log("  done: " + label);
}
step("import", "YourQuotePreview", `import PaymentReassure from "@/components/PaymentReassure";`, `import PaymentReassure from "@/components/PaymentReassure";\nimport YourQuotePreview from "@/components/YourQuotePreview";`);
step("load business details", "logo_url, brand_color", `.from("businesses").select("id").maybeSingle();`, `.from("businesses").select("id, name, logo_url, brand_color, phone").maybeSingle();`);
step("greeting", "} is set up`", `<p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">Choose your plan</p>`,
  `<p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">{onboarding && !active && business.name ? \`\${business.name} is set up\` : "Choose your plan"}</p>`);
step("sub-line", "One step and your first quote", `You pay securely through our payment partner, and Yebo never sees your card details.</p>`,
  `You pay securely through our payment partner, and Yebo never sees your card details.</p>\n        {onboarding && !active && <p className="mt-3 text-base font-bold text-ink">One step and your first quote can go out today.</p>}`);
step("preview", "<YourQuotePreview", `      <div className="mt-10">\n        <PlanGrid`,
  `      {onboarding && !active && business.name && <YourQuotePreview name={business.name} logoUrl={business.logo_url} color={business.brand_color} phone={business.phone} />}\n\n      <div className="mt-10">\n        <PlanGrid`);
if (changed) fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("Done. Now: pnpm build");
