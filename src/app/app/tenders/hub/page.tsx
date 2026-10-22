import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenderAccess } from "@/lib/tender-access";
import { TENDER_CATEGORIES, closingInfo } from "@/lib/tenders";
import { PROVINCES, type FeedDoc } from "@/lib/tender-feed";
import { formatSouthAfricaDateTime } from "@/lib/time";
import TenderUpgrade from "../TenderUpgrade";
import HubPreferences from "./HubPreferences";
import { startBid } from "./actions";

const PAGE_SIZE = 60;

type FeedItem = {
  id: string; reference: string | null; title: string; buyer: string | null; category: string | null; province: string | null;
  closing_at: string | null; documents: FeedDoc[] | null;
};

const toneClass = { urgent: "bg-orange/15 text-orange", ok: "bg-lime/40 text-yebo-deep", closed: "bg-ink/10 text-ink/60", none: "bg-ink/5 text-ink/50" } as const;
const errors: Record<string, string> = {
  missing: "That tender is no longer in the hub.",
  closed: "That tender has already closed.",
  failed: "We could not open that bid. Please try again.",
};

// A search box value is used inside a filter, so strip the characters that have a meaning there.
const safeSearch = (q: string) => q.replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export default async function TenderHub({ searchParams }: { searchParams: Promise<{ view?: string; category?: string; province?: string; q?: string; error?: string }> }) {
  const params = await searchParams;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await sb.from("businesses").select("id").maybeSingle();
  if (!business) redirect("/app/onboarding");
  if (!(await tenderAccess(sb)).allowed) return <TenderUpgrade />;

  const { data: prefRow } = await sb
    .from("tender_preferences")
    .select("categories,provinces,auto_draft,email_alerts,default_markup_percent")
    .eq("business_id", business.id)
    .maybeSingle();
  const prefs = {
    categories: (prefRow?.categories ?? []) as string[],
    provinces: (prefRow?.provinces ?? []) as string[],
    autoDraft: Boolean(prefRow?.auto_draft),
    emailAlerts: prefRow?.email_alerts ?? true,
    markupPercent: prefRow?.default_markup_percent == null ? 10 : Number(prefRow.default_markup_percent),
  };

  const hasPrefs = prefs.categories.length > 0;
  const view = params.view === "all" || !hasPrefs ? "all" : "mine";
  const category = (TENDER_CATEGORIES as readonly string[]).includes(params.category ?? "") ? (params.category as string) : "";
  const province = (PROVINCES as readonly string[]).includes(params.province ?? "") ? (params.province as string) : "";
  const q = safeSearch(params.q ?? "");

  // Only tenders that have not closed. The daily job also deletes the old ones.
  let query = sb
    .from("tender_feed")
    .select("id,reference,title,buyer,category,province,closing_at,documents")
    .gt("closing_at", new Date().toISOString())
    .order("closing_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (view === "mine") {
    query = query.in("category", prefs.categories);
    if (prefs.provinces.length) query = query.or(`province.is.null,province.in.(${prefs.provinces.map((p) => `"${p}"`).join(",")})`);
  }
  if (category) query = query.eq("category", category);
  if (province) query = query.eq("province", province);
  if (q) query = query.or(`title.ilike.%${q}%,buyer.ilike.%${q}%,reference.ilike.%${q}%`);
  const { data } = await query;
  const items = (data ?? []) as FeedItem[];

  const { data: mine } = items.length
    ? await sb.from("tenders").select("id,feed_id,status").in("feed_id", items.map((i) => i.id))
    : { data: [] as { id: string; feed_id: string; status: string }[] };
  const bidOf = new Map((mine ?? []).map((t) => [t.feed_id as string, t.id as string]));

  const link = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(params.view ? { view: params.view } : {}), ...(category ? { category } : {}), ...(province ? { province } : {}), ...(q ? { q } : {}), ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return `/app/tenders/hub${s ? `?${s}` : ""}`;
  };
  const tab = (active: boolean) => `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition ${active ? "bg-ink text-white" : "border border-ink/15 text-ink/70 hover:bg-paper"}`;
  const select = "min-h-11 rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-yebo";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/app/tenders" className="text-sm font-bold text-yebo">← My tenders</Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Tender hub</h1>
      <p className="mt-1 text-sm leading-6 text-ink/60">Live public tenders from National Treasury&rsquo;s eTenders, matched to your trades. Tenders that have closed are removed automatically.</p>

      {params.error && errors[params.error] && <p role="alert" className="mt-4 rounded-2xl border border-orange/40 bg-orange/10 p-3 text-sm font-semibold text-ink">{errors[params.error]}</p>}

      <HubPreferences initial={prefs} startOpen={!hasPrefs} />

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Which tenders to show">
        <Link role="tab" aria-selected={view === "mine"} href={link({ view: "mine" })} className={tab(view === "mine")}>Matches for me</Link>
        <Link role="tab" aria-selected={view === "all"} href={link({ view: "all" })} className={tab(view === "all")}>All open tenders</Link>
      </div>

      <form method="get" className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} placeholder="Search title, buyer or number" aria-label="Search tenders" className={`${select} w-full`} />
        <select name="category" defaultValue={category} aria-label="Trade" className={select}>
          <option value="">Any trade</option>
          {TENDER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="province" defaultValue={province} aria-label="Province" className={select}>
          <option value="">Any province</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="min-h-11 rounded-xl bg-ink px-5 text-sm font-extrabold text-white hover:bg-ink/85">Filter</button>
      </form>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="text-lg font-black text-ink">{hasPrefs && view === "mine" ? "No matching tenders right now" : "No open tenders to show"}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
            {hasPrefs && view === "mine"
              ? "New tenders are added every morning. Try All open tenders, or add more trades above."
              : "The hub fills up every morning. If it stays empty, tell Yebo support so we can check the tender source."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((t) => {
            const closing = closingInfo(t.closing_at);
            const bid = bidOf.get(t.id);
            const docs = (t.documents ?? []).slice(0, 3);
            return (
              <li key={t.id} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
                <p className="text-base font-extrabold leading-snug text-ink">{t.title}</p>
                <p className="mt-0.5 text-sm text-ink/60">{[t.reference, t.buyer].filter(Boolean).join(" · ")}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.category && <span className="rounded-full bg-yebo-chalk px-2.5 py-1 text-[11px] font-bold text-yebo-deep">{t.category}</span>}
                  {t.province && <span className="rounded-full bg-yebo-chalk px-2.5 py-1 text-[11px] font-bold text-ink/70">{t.province}</span>}
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass[closing.tone]}`}>{closing.label}{t.closing_at ? ` · ${formatSouthAfricaDateTime(t.closing_at)}` : ""}</span>
                </div>
                {docs.length > 0 && (
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    {docs.map((d) => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="max-w-full truncate text-yebo underline underline-offset-2">{d.title}</a>)}
                  </p>
                )}
                <div className="mt-4">
                  {bid ? (
                    <Link href={`/app/tenders/${bid}`} className="inline-flex min-h-11 items-center rounded-xl border border-yebo-deep/20 bg-white px-5 text-sm font-extrabold text-ink hover:border-yebo">Open my bid</Link>
                  ) : (
                    <form action={startBid.bind(null, t.id)}>
                      <button className="inline-flex min-h-11 items-center rounded-xl bg-yebo px-5 text-sm font-extrabold text-white hover:bg-yebo-deep">Start a bid</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length >= PAGE_SIZE && <p className="mt-4 text-center text-xs text-ink/50">Showing the {PAGE_SIZE} closing soonest. Use the filters to narrow it down.</p>}
    </main>
  );
}
