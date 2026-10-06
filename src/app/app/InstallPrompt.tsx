"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }>();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const handler = (event: Event) => { event.preventDefault(); setInstallEvent(event as typeof installEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !installEvent?.prompt) return null;
  return <button onClick={async () => { await installEvent.prompt?.(); setInstalled(true); }} className="rounded-full border border-yebo-deep/15 bg-white px-3 py-2 text-xs font-bold text-yebo-deep shadow-sm transition hover:-translate-y-0.5 hover:border-yebo" aria-label="Install Yebo as an app">Install app</button>;
}
