"use client";

import { useEffect, useState } from "react";

// The last safety net. If something in the app itself breaks (rather than one page), the person sees this instead of a blank screen.
// Most of these are one-off glitches that a reload fixes, so we reload once by ourselves before showing anything.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    let reloaded = false;
    try {
      const last = Number(sessionStorage.getItem("yebo-auto-reload") || "0");
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem("yebo-auto-reload", String(Date.now()));
        reloaded = true;
        window.location.reload();
      }
    } catch {
      /* private mode: just show the message */
    }
    if (!reloaded) setShowing(true);
  }, [error]);

  if (!showing) return null;
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F2F6F3", fontFamily: "Arial, Helvetica, sans-serif", color: "#0C3B2E" }}>
        <main style={{ maxWidth: 460, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 26, margin: "0 0 12px" }}>Something went wrong on our side</h1>
          <p style={{ fontSize: 16, lineHeight: "24px", color: "#33443d", margin: "0 0 28px" }}>
            Your work is safe. Tap the button to try again. If it keeps happening, tell Steve on WhatsApp and he will sort it out.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem("yebo-auto-reload"); } catch {} reset(); }}
            style={{ background: "#0F8A5F", color: "#fff", border: 0, borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
          <p style={{ marginTop: 18 }}><a href="/app" style={{ color: "#0F8A5F", fontSize: 14 }}>Go to my dashboard</a></p>
        </main>
      </body>
    </html>
  );
}
