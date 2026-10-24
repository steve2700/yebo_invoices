"use client";

import { useCallback, useEffect, useState } from "react";

type InstallEvent = Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
type Platform = "ios-safari" | "ios-other" | "android" | "desktop";

const DISMISS_KEY = "yebo-install-dismissed";
const DISMISS_DAYS = 14;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(ua) ? "ios-other" : "ios-safari";
  return /Android/i.test(ua) ? "android" : "desktop";
}

// Shared by the top-bar button and the banner. `ready` stays false until the browser has told us the facts, so nothing flashes.
function useInstall() {
  const [event, setEvent] = useState<InstallEvent>();
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [ready, setReady] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setPlatform(detectPlatform());
    setReady(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setJustInstalled(true); setEvent(undefined); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  // One tap installs when the browser allows it. Otherwise (iPhone, or Chrome not ready yet) we show the steps.
  const install = useCallback(async (showSteps: () => void) => {
    if (event?.prompt) {
      await event.prompt();
      const choice = await event.userChoice?.catch(() => undefined);
      if (choice?.outcome === "accepted") { setInstalled(true); setJustInstalled(true); }
      setEvent(undefined);
    } else showSteps();
  }, [event]);

  return { ready, installed, platform, install, justInstalled, dismissDone: () => setJustInstalled(false) };
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-yebo text-sm font-black text-white">{n}</span>
    <span className="pt-0.5 text-sm leading-6 text-yebo-deep">{children}</span>
  </li>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-0.5 inline -translate-y-0.5"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
);

function HowToSheet({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Add Yebo to your home screen" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-yebo-deep">Add Yebo to your home screen</h2>
            <p className="mt-1 text-sm text-yebo-deep/60">It opens like any other app, with its own Y icon, and no browser bar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-yebo-deep/50 hover:bg-yebo-chalk">×</button>
        </div>
        <ol className="mt-5 flex flex-col gap-4">
          {platform === "ios-safari" && (<>
            <Step n={1}>Tap the Share button <ShareIcon /> at the bottom of Safari.</Step>
            <Step n={2}>Scroll down and tap <b>Add to Home Screen</b>.</Step>
            <Step n={3}>Tap <b>Add</b> in the top corner. Look for the orange <b>Yebo</b> icon on your home screen.</Step>
          </>)}
          {platform === "ios-other" && (<>
            <Step n={1}>iPhones only allow this from Safari. Copy this page&rsquo;s address and open it in <b>Safari</b>.</Step>
            <Step n={2}>Tap the Share button <ShareIcon />, then <b>Add to Home Screen</b>.</Step>
            <Step n={3}>Tap <b>Add</b>. Look for the orange <b>Yebo</b> icon on your home screen.</Step>
          </>)}
          {platform === "android" && (<>
            <Step n={1}>Tap the <b>⋮</b> menu at the top right of Chrome.</Step>
            <Step n={2}>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</Step>
            <Step n={3}>Tap <b>Install</b>. Look for the orange <b>Yebo</b> icon in your apps.</Step>
          </>)}
          {platform === "desktop" && (<>
            <Step n={1}>Look for the install icon at the right end of the address bar, or open the browser menu.</Step>
            <Step n={2}>Choose <b>Install Yebo Invoices</b>.</Step>
          </>)}
        </ol>
        <button type="button" onClick={onClose} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-yebo text-sm font-extrabold text-white hover:bg-yebo-deep">Got it</button>
      </div>
    </div>
  );
}


// Shown right after a successful install. A website cannot launch the installed app by itself, so we say exactly where it is.
function DoneSheet({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Yebo is installed" onClick={(e) => e.stopPropagation()} className="pop-in w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={72} height={72} className="mx-auto size-[72px] rounded-2xl shadow-lg" />
        <h2 className="mt-4 text-xl font-black text-yebo-deep">Yebo is installed</h2>
        <p className="mt-2 text-sm leading-6 text-yebo-deep/65">
          {platform === "desktop"
            ? "Yebo now opens in its own window, like any other program. Look for it in your Start menu or Applications."
            : "Close this tab and tap the orange Y named Yebo on your home screen or in your apps. From now on it opens straight into the app, with no browser bar."}
        </p>
        <button type="button" onClick={onClose} className="press mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-yebo text-sm font-extrabold text-white hover:bg-yebo-deep">Got it</button>
      </div>
    </div>
  );
}

// Top-bar button. Shown to everyone who has not installed yet, including iPhone, which never offers an install prompt.
export default function InstallPrompt() {
  const { ready, installed, platform, install, justInstalled, dismissDone } = useInstall();
  const [steps, setSteps] = useState(false);
  if (!ready) return null;
  if (installed) return justInstalled ? <DoneSheet platform={platform} onClose={dismissDone} /> : null;
  return (
    <>
      <button type="button" onClick={() => install(() => setSteps(true))} className="press shrink-0 whitespace-nowrap rounded-full border border-yebo-deep/15 bg-white px-3 py-2 text-xs font-bold text-yebo-deep shadow-sm transition hover:-translate-y-0.5 hover:border-yebo" aria-label="Install Yebo as an app">Install app</button>
      {steps && <HowToSheet platform={platform} onClose={() => setSteps(false)} />}
    </>
  );
}

// A friendly card for phones that explains the benefit. "Not now" hides it for two weeks, and it never shows once installed.
export function InstallBanner() {
  const { ready, installed, platform, install, justInstalled, dismissDone } = useInstall();
  const [steps, setSteps] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000);
    } catch { setHidden(false); }
  }, []);

  if (!ready) return null;
  if (installed) return justInstalled ? <DoneSheet platform={platform} onClose={dismissDone} /> : null;
  if (hidden || platform === "desktop") return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ } };
  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 pt-4 sm:hidden">
        <div className="flex items-center gap-3 rounded-2xl border border-yebo/25 bg-white p-3.5 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-yebo-deep">Put Yebo on your home screen</p>
            <p className="text-xs leading-5 text-yebo-deep/60">Open it in one tap, like any other app.</p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1">
            <button type="button" onClick={() => install(() => setSteps(true))} className="press min-h-9 rounded-full bg-yebo px-4 text-xs font-extrabold text-white hover:bg-yebo-deep">{platform === "android" ? "Install" : "Show me how"}</button>
            <button type="button" onClick={dismiss} className="text-[11px] font-semibold text-yebo-deep/50 hover:text-yebo-deep">Not now</button>
          </div>
        </div>
      </div>
      {steps && <HowToSheet platform={platform} onClose={() => setSteps(false)} />}
    </>
  );
}

// For public pages (landing page): a button in whatever style the page passes in. Hidden once Yebo is installed.
export function InstallAppButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { ready, installed, platform, install, justInstalled, dismissDone } = useInstall();
  const [steps, setSteps] = useState(false);
  if (!ready) return null;
  if (installed) return justInstalled ? <DoneSheet platform={platform} onClose={dismissDone} /> : null;
  return (
    <>
      <button type="button" onClick={() => install(() => setSteps(true))} className={className}>{children ?? "Install the app"}</button>
      {steps && <HowToSheet platform={platform} onClose={() => setSteps(false)} />}
    </>
  );
}

// Inside the installed app, the marketing page is pointless: go straight to the app (it sends signed-out people to sign in).
export function StandaloneRedirect() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) window.location.replace("/app");
  }, []);
  return null;
}
