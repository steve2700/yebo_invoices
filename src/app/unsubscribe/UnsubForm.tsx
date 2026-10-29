"use client";

import { useState } from "react";
import { unsubscribe } from "./actions";

export default function UnsubForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad">("idle");
  async function submit(formData: FormData) {
    setState("busy");
    const r = await unsubscribe(formData).catch(() => ({ ok: false }));
    setState(r.ok ? "done" : "bad");
  }
  if (state === "done") return <p className="mt-4 rounded-2xl bg-yebo-chalk p-4 text-sm font-bold text-yebo-deep">Done. We will not send you these reminder emails again.</p>;
  return (
    <form action={submit} className="mt-5">
      <input type="hidden" name="e" value={email} />
      <input type="hidden" name="t" value={token} />
      <button disabled={state === "busy"} className="min-h-12 rounded-full bg-yebo px-6 text-sm font-extrabold text-white disabled:opacity-50">
        {state === "busy" ? "Please wait…" : "Stop these emails"}
      </button>
      {state === "bad" && <p role="alert" className="mt-3 text-sm text-red-700">That did not work. Reply to the email and we will remove you by hand.</p>}
    </form>
  );
}
