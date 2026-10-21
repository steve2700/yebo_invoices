"use client";

import { useState } from "react";
import { SA_BANKS, branchCodeFor, normaliseBankName } from "@/lib/sa-banks";

// Bank dropdown plus branch code. Picking a bank fills in its universal branch code,
// which the owner can still edit. Use the same component in onboarding and Settings.
export default function BankFields({
  defaultBank,
  defaultBranchCode,
  labelClass,
  inputClass,
  placeholder = "Not set",
}: {
  defaultBank?: string | null;
  defaultBranchCode?: string | null;
  labelClass: string;
  inputClass: string;
  placeholder?: string;
}) {
  const [bank, setBank] = useState(normaliseBankName(defaultBank));
  const [code, setCode] = useState(defaultBranchCode ?? "");

  return (
    <>
      <label className={labelClass}>
        Bank
        <select
          name="bank_name"
          value={bank}
          onChange={(e) => {
            const next = e.target.value;
            setBank(next);
            if (next) setCode(branchCodeFor(next));
          }}
          className={inputClass}
        >
          <option value="">{placeholder}</option>
          {SA_BANKS.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Branch code
        <input
          name="bank_branch_code"
          inputMode="numeric"
          maxLength={6}
          placeholder="6 digits"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </label>
    </>
  );
}
