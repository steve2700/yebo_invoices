import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/", "/auth/", "/d/", "/login"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
