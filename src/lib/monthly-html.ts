import { escapeHtml as h } from "./email";
import { formatRand } from "./money";
import { appUrl } from "./url";
import { versus, winRate, YEBO_WHATSAPP_DISPLAY, YEBO_WHATSAPP_URL, type MonthData, type MonthVerdict, type MonthWindows } from "./monthly";

const GREEN = "#0F8A5F", DEEP = "#0C3B2E", INK = "#10241b", MUTED = "#5b6b63";

const tile = (label: string, value: string, sub: string) =>
  `<td width="33%" valign="top" style="padding:0 4px"><div style="background:#f2f6f3;border-radius:12px;padding:14px 10px;text-align:center"><div style="font-size:26px;font-weight:800;color:${INK};line-height:1.1">${h(value)}</div><div style="font-size:12px;font-weight:700;color:${DEEP};margin-top:4px">${h(label)}</div><div style="font-size:11px;color:${MUTED};margin-top:2px">${h(sub)}</div></div></td>`;

const line = (name: string, value: string, warn = false) =>
  `<tr><td style="padding:9px 0;font-size:14px;color:${MUTED};border-top:1px solid #e3ebe6">${h(name)}</td><td style="padding:9px 0;font-size:14px;font-weight:700;text-align:right;color:${warn ? "#b42318" : INK};border-top:1px solid #e3ebe6">${h(value)}</td></tr>`;

// The month-end email. Table layout and inline styles only, so it looks right in Gmail, Outlook and phone mail apps.
export function renderMonthlyEmail(input: { name: string | null; d: MonthData; w: MonthWindows; v: MonthVerdict; brandColor?: string | null }): string {
  const { d, w, v } = input;
  const color = /^#[0-9a-f]{6}$/i.test(input.brandColor ?? "") ? (input.brandColor as string) : GREEN;
  const rate = winRate(d);
  const up = d.collectedCents > d.collectedPrevCents, same = d.collectedCents === d.collectedPrevCents;
  const pill = same ? "" : `<span style="display:inline-block;background:${up ? "#dff5e8" : "#fdeaea"};color:${up ? "#0a6b43" : "#b42318"};font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;margin-top:8px">${h((up ? "Up " : "Down ") + formatRand(Math.abs(d.collectedCents - d.collectedPrevCents)) + " on " + w.prevLabel)}</span>`;

  const maxMoney = Math.max(1, ...d.weeks.map((x) => x.collectedCents));
  const weeks = d.weeks.map((x) => {
    const pct = x.started && x.collectedCents > 0 ? Math.max(4, Math.round((x.collectedCents / maxMoney) * 100)) : 0;
    const detail = !x.started ? "Still to come" : `${x.sent} sent, ${x.accepted} accepted`;
    return `<tr><td style="padding:10px 0;border-top:1px solid #e3ebe6;width:78px;vertical-align:top"><div style="font-size:13px;font-weight:800;color:${INK}">${h(x.label)}</div><div style="font-size:11px;color:${MUTED}">${h(x.range)}</div></td>
<td style="padding:10px 8px;border-top:1px solid #e3ebe6;vertical-align:middle"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#eaf0ec;border-radius:6px;height:12px;line-height:12px;font-size:0"><table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0"><tr><td style="background:${color};border-radius:6px;height:12px;line-height:12px;font-size:0">&nbsp;</td></tr></table></td></tr></table><div style="font-size:11px;color:${MUTED};margin-top:4px">${h(detail)}</div></td>
<td style="padding:10px 0;border-top:1px solid #e3ebe6;text-align:right;vertical-align:top;font-size:13px;font-weight:800;color:${x.started ? INK : "#9aa8a1"};white-space:nowrap">${x.started ? h(formatRand(x.collectedCents)) : "-"}</td></tr>`;
  }).join("");

  const tips = v.tips.length
    ? `<tr><td style="padding:18px 24px 0"><div style="background:#fff7e0;border-radius:12px;padding:14px 16px"><div style="font-size:13px;font-weight:800;color:#7a5200;margin-bottom:6px">Do this next</div>${v.tips.map((t) => `<div style="font-size:14px;line-height:1.55;color:#4a3a10;padding:3px 0">&bull; ${h(t)}</div>`).join("")}</div></td></tr>`
    : "";

  return `<!doctype html><html lang="en"><body style="margin:0;background:#eef3f0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${DEEP};padding:18px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:.3px">Yebo <span style="color:#C6F24E">Invoices</span></td><td align="right"><span style="display:inline-block;background:#C6F24E;color:${DEEP};font-size:12px;font-weight:800;border-radius:999px;padding:5px 12px">${h(w.label)}</span></td></tr></table></td></tr>
<tr><td style="padding:26px 24px 0"><div style="font-size:13px;font-weight:700;color:${MUTED}">${h(input.name ? `${input.name}, your month` : "Your month")}</div><h1 style="margin:6px 0 0;font-size:26px;line-height:1.25;color:${INK}">${h(v.headline)}</h1><p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#33453c">${h(v.detail)}</p>${pill ? `<div>${pill}</div>` : ""}</td></tr>
<tr><td style="padding:20px 20px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile("Quotes sent", String(d.sent), versus(d.sent, d.sentPrev, w.prevLabel))}${tile("Accepted", String(d.accepted), versus(d.accepted, d.acceptedPrev, w.prevLabel))}${tile("Said yes", rate === null ? "-" : `${rate}%`, rate === null ? "not enough answers" : "of those decided")}</tr></table></td></tr>
<tr><td style="padding:22px 24px 0"><div style="font-size:15px;font-weight:800;color:${INK};margin-bottom:2px">Week by week</div><div style="font-size:12px;color:${MUTED};margin-bottom:6px">Money collected each week</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weeks}</table></td></tr>
<tr><td style="padding:18px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${line("Invoiced this month", `${d.invoiced} for ${formatRand(d.invoicedCents)}`)}${line("Waiting to be paid", `${d.waiting} for ${formatRand(d.waitingCents)}`)}${line("Overdue", d.overdue ? `${d.overdue} for ${formatRand(d.overdueCents)}` : "None", d.overdue > 0)}${line("Total collected", formatRand(d.collectedCents))}</table></td></tr>
${tips}
<tr><td style="padding:24px 24px 6px"><a href="${h(appUrl() + "/app")}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;margin:0 8px 8px 0">Open my dashboard</a><a href="${YEBO_WHATSAPP_URL}" style="display:inline-block;background:#25D366;color:#073b1b;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;margin:0 8px 8px 0">WhatsApp us ${h(YEBO_WHATSAPP_DISPLAY)}</a></td></tr>
<tr><td style="padding:10px 24px 26px;font-size:12px;line-height:1.6;color:#6b7b73">Your Yebo summary for ${h(w.label)}. To stop this email, WhatsApp us on ${h(YEBO_WHATSAPP_DISPLAY)} and we will switch it off.</td></tr>
</table></td></tr></table></body></html>`;
}
