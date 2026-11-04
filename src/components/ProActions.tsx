"use client";

// Call now and WhatsApp now are normal links (they work with no JavaScript). We also count the tap so each business can see what Yebo sends them.
export default function ProActions({ id, page, tel, wa, color }: { id: string; page: string; tel: string | null; wa: string | null; color: string }) {
  const count = (k: "call" | "whatsapp") => {
    try { navigator.sendBeacon("/api/jobs/click", new Blob([JSON.stringify({ b: id, p: page, k })], { type: "application/json" })); } catch { /* the call still goes through */ }
  };
  const btn = "tap inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 text-base font-extrabold transition active:scale-95";
  return (
    <div className="mt-4 flex gap-3">
      {tel && <a href={tel} onClick={() => count("call")} className={btn + " text-white"} style={{ backgroundColor: color }}>Call now</a>}
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => count("whatsapp")} className={btn + " bg-[#25D366] text-[#08341c]"}>WhatsApp now</a>}
    </div>
  );
}
