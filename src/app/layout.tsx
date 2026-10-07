import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { appUrl } from "@/lib/url";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: "Yebo Invoices | Clear quotes, faster invoicing",
  description: "Create professional quotes and invoices for South African small businesses. Draft from a voice note, share a clear client link and turn accepted quotes into invoices.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "1024x1024", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0C3B2E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="bg-yebo-chalk font-sans text-yebo-deep antialiased">{children}</body>
    </html>
  );
}
