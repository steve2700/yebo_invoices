"use client";

import { useMemo, useState } from "react";
import { qrMatrix } from "@/lib/qr-matrix";
import { SOURCES, SOURCE_GROUPS, cleanSource, sourceLabel, sourceUrl } from "@/lib/request-sources";

const btn = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo";
const QUIET = 4;

function qrSvg(url: string, px = 240): string {
  const m = qrMatrix(url, "M");
  const n = m.length + QUIET * 2;
  let d = "";
  m.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function downloadPng(url: string, name: string) {
  const m = qrMatrix(url, "M");
  const cell = 12;
  const size = (m.length + QUIET * 2) * cell;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000";
  m.forEach((row, r) => row.forEach((dark, c) => { if (dark) ctx.fillRect((c + QUIET) * cell, (r + QUIET) * cell, cell, cell); }));
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function printPoster(url: string, businessName: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(businessName)} - quote request poster</title>
<style>@page{margin:14mm}body{font-family:Arial,Helvetica,sans-serif;text-align:center;margin:0;padding:24px;color:#111}
h1{font-size:44px;margin:0 0 6px}h2{font-size:28px;margin:0 0 20px;font-weight:600}svg{width:420px;height:420px;margin:10px auto;display:block}
p{font-size:18px;margin:6px 0}.url{font-size:15px;color:#444;word-break:break-all}</style></head>
<body><h1>${esc(businessName)}</h1><h2>Scan to ask for a quote</h2>${qrSvg(url, 420)}<p>Point your phone camera at the square.</p><p class="url">${esc(url)}</p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard can be blocked */ }
    }}>{done ? "Copied" : "Copy"}</button>
  );
}

export default function ShareTools({ base, token, businessName, counts }: { base: string; token: string; businessName: string; counts: Record<string, number> }) {
  const [source, setSource] = useState("");
  const [custom, setCustom] = useState("");
  const url = sourceUrl(base, token, source);
  const svg = useMemo(() => qrSvg(url), [url]);
  const customKey = cleanSource(custom);

  return (
    <section aria-labelledby="share-h" className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-6">
      <h2 id="share-h" className="text-lg font-extrabold">QR code and links for each place</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">Every place gets its own link. When a request comes in, you see where it came from, so you know what is worth your time.</p>

      <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl bg-paper p-4 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-xl bg-white p-1 ring-1 ring-ink/10" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`QR code for ${sourceLabel(source)}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Showing</p>
          <p className="text-base font-extrabold">{source ? sourceLabel(source) : "Your plain link"}</p>
          <p className="mt-1 break-all text-xs text-ink/55">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={url} />
            <button type="button" className={`${btn} bg-yebo text-white hover:bg-yebo-deep`} onClick={() => downloadPng(url, `request-qr-${source || "link"}`)}>Download QR</button>
            <button type="button" className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`} onClick={() => printPoster(url, businessName)}>Print poster</button>
          </div>
          {source && <button type="button" className="mt-3 text-sm font-bold text-yebo" onClick={() => setSource("")}>Back to the plain link</button>}
        </div>
      </div>

      {SOURCE_GROUPS.map((group) => (
        <div key={group} className="mt-6">
          <h3 className="text-sm font-extrabold text-ink/70">{group}</h3>
          <ul className="mt-2 divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {SOURCES.filter((s) => s.group === group).map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-sm font-bold">{s.label} {counts[s.key] ? <span className="ml-1 rounded-full bg-yebo-chalk px-2 py-0.5 text-xs font-bold text-yebo-deep">{counts[s.key]} request{counts[s.key] === 1 ? "" : "s"}</span> : null}</p>
                  <p className="text-xs text-ink/50">{s.tip}</p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={sourceUrl(base, token, s.key)} />
                  <button type="button" className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk`} onClick={() => { setSource(s.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}>QR</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-6 rounded-2xl border border-ink/10 p-4">
        <h3 className="text-sm font-extrabold text-ink/70">Somewhere else?</h3>
        <p className="mt-1 text-xs text-ink/55">Type a name, for example <span className="font-semibold">spar-notice-board</span>. Letters, numbers and dashes only.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input aria-label="Name of the place" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={30} placeholder="my-estate-newsletter" className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink/15 px-3 text-sm outline-none focus:border-yebo focus:ring-2 focus:ring-yebo/20" />
          <button type="button" disabled={!customKey} className={`${btn} border border-ink/15 bg-white hover:bg-yebo-chalk disabled:opacity-40`} onClick={() => { setSource(customKey); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Make link and QR</button>
        </div>
        {customKey && <p className="mt-2 break-all text-xs text-ink/55">{sourceUrl(base, token, customKey)}</p>}
      </div>
    </section>
  );
}
