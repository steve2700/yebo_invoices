"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl border-2 border-neutral-300 px-4 py-2 font-bold print:hidden">
      Download / print PDF
    </button>
  );
}
