import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";
import { FEATURE_GROUPS } from "@/lib/features";
import { PAGES } from "@/lib/opportunities";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appUrl(),
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: `${appUrl()}/features`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl()}/jobs`, changeFrequency: "weekly", priority: 0.7 },
    ...PAGES.map((p) => ({ url: `${appUrl()}/jobs/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...FEATURE_GROUPS.map((g) => ({ url: `${appUrl()}/features/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${appUrl()}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl()}/why-yebo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl()}/why-i-built-yebo-invoices`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl()}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl()}/which-plan`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl()}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl()}/tenders`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl()}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl()}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
