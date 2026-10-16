// Tiny standalone pages returned by payment routes: a "taking you to PayFast" page that submits itself, and a plain message page.
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const pageStyle = "font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f8f6;color:#10241b;padding:24px;box-sizing:border-box";

export function messagePage(title: string, message: string, status: number, backHref?: string, backLabel = "Go back") {
  const back = backHref ? `<p style="margin-top:20px"><a href="${escapeHtml(backHref)}" style="color:#0f8a5f;font-weight:700">${escapeHtml(backLabel)}</a></p>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="${pageStyle}"><main style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(title)}</h1><p style="line-height:1.6;color:#44574e;margin:0">${escapeHtml(message)}</p>${back}</main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export function autoPostPage(action: string, fields: [string, string][]) {
  const inputs = fields.map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Taking you to PayFast</title></head><body style="${pageStyle}"><form id="pf" method="post" action="${escapeHtml(action)}" style="max-width:420px;text-align:center"><p style="font-size:18px;font-weight:700;margin:0 0 8px">Taking you to PayFast to pay securely…</p><p style="color:#44574e;margin:0 0 16px">You will come straight back here when you are done.</p>${inputs}<button type="submit" style="min-height:44px;border:0;border-radius:12px;background:#0f8a5f;color:#fff;font-weight:700;padding:0 20px;font-size:16px;cursor:pointer">Continue to PayFast</button></form><script>document.getElementById("pf").submit();</script></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
