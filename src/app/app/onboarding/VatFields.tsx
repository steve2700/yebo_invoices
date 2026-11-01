"use client";
import { useState } from "react";

// The VAT number only shows once "I am VAT registered" is ticked, so most people see one tick box and nothing else.
export default function VatFields({ registered, number, inputClass }: { registered: boolean; number: string; inputClass: string }) {
  const [on, setOn] = useState(registered);
  return (
    <div className="rounded-xl border border-ink/10 bg-paper/50 p-3.5">
      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="vat_registered" checked={on} onChange={(event) => setOn(event.target.checked)} className="mt-0.5 size-4 accent-orange" />
        <span><span className="font-semibold">I am VAT registered</span><span className="block text-xs text-ink/50">We add 15% VAT and your VAT number to your tax invoices.</span></span>
      </label>
      {on && (
        <label className="mt-3 block text-sm font-semibold text-ink">VAT number
          <input name="vat_number" inputMode="numeric" pattern="\d{10}" title="A VAT number is 10 digits" defaultValue={number} placeholder="10 digits" className={inputClass} />
        </label>
      )}
    </div>
  );
}
