import type { MetadataRoute } from "next";

// What a phone reads when someone installs Yebo: the name under the icon, the icon itself, and the quick actions
// that appear when the icon is pressed and held.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Yebo Invoices",
    short_name: "Yebo",
    description: "Quotes and invoices for South African small businesses.",
    lang: "en-ZA",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["business", "finance", "productivity"],
    background_color: "#F2F6F3",
    theme_color: "#0C3B2E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "New quote", short_name: "New quote", url: "/app/quotes/new", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Documents", short_name: "Documents", url: "/app/documents", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Tenders", short_name: "Tenders", url: "/app/tenders", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}

export const dynamic = "force-static";
