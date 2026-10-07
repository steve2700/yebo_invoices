import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appUrl(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
