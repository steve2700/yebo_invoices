import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appUrl(),
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: `${appUrl()}/tenders`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl()}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl()}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
