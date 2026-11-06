// One tidy "As featured on" row for the directory badges, so the footer columns stay clean.
// Plain <img> on purpose: these are third-party images and need no optimising. Links stay followable (no nofollow).
// To add another listing, add one entry below.
type Badge = { href: string; src: string; alt: string; title?: string; extra?: Record<string, string> };

const BADGES: Badge[] = [
  { href: "https://lift-off.sh/p/yebo-invoices", src: "https://lift-off.sh/images/badges/badgeLaunchedLight.webp", alt: "Yebo Invoices on LiftOff", title: "LiftOff launch badge" },
  { href: "https://productwing.com/product/yeboinvoices", src: "https://productwing.com/assets/images/badge.png", alt: "Yebo Invoices on Product Wing" },
  { href: "https://startupbenchmarks.com/product/yeboinvoices", src: "https://startupbenchmarks.com/assets/images/badge.png", alt: "Yebo Invoices on Startup Benchmarks" },
  { href: "https://trustiner.com/product/yeboinvoices", src: "https://trustiner.com/assets/images/badge.png", alt: "Yebo Invoices on Trustiner" },
  { href: "https://startupfa.me/s/yebo?utm_source=www.yeboinvoices.com", src: "https://startupfa.me/badges/featured-badge-small.webp", alt: "Yebo Invoices - Featured on Startup Fame" },
  { href: "https://www.claudeai.directory/launches/yebo-invoices", src: "https://www.claudeai.directory/badge/yebo-invoices", alt: "Yebo Invoices - Listed on Claude AI Directory" },
  { href: "https://www.neura.market/directories/ai-tools", src: "https://ykpiumpcqlgqzgslxicn.supabase.co/storage/v1/object/public/brand-assets/featured-badge.png", alt: "Featured on Neura Market", title: "Featured on Neura Market — the AI tools & companies directory", extra: { "data-neura-market-badge": "tool" } },
  { href: "https://twelve.tools", src: "https://twelve.tools/badge0-white.svg", alt: "Featured on Twelve Tools" },
  { href: "https://superlaunchlist.com?ref=https%3A%2F%2Fwww.yeboinvoices.com%2F", src: "https://superlaunchlist.com/badge.svg", alt: "Featured on SuperLaunch List" },
  { href: "https://mylaunchstash.com/product/yeboinvoices", src: "https://mylaunchstash.com/assets/images/badge.png", alt: "My Launch Stash" },
  { href: "https://goodaitools.com/ai/yeboinvoices", src: "https://goodaitools.com/assets/images/badge.png", alt: "Good AI Tools" },
  { href: "https://fastlaunch.io", src: "https://fastlaunch.io/images/badges/featured-light.svg", alt: "Featured on FastLaunch" },
  { href: "https://navfolders.com", src: "https://navfolders.com/badge/nav_light.svg", alt: "NavFolders" },
];

export default function FeaturedOn() {
  return (
    <div className="border-t border-yebo-deep/10">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-yebo-deep/55">As featured on</p>
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {BADGES.map((b) => (
            <li key={b.href} className="flex h-7 items-center">
              <a href={b.href} title={b.title} target="_blank" rel="noopener" className="inline-flex h-7 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yebo" {...b.extra}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading="lazy" style={{ height: 28, width: "auto", maxWidth: "100%" }} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
