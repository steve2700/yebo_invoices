import SubmitButton from "@/components/SubmitButton";
import { PLANS, priceLabel } from "@/lib/plans";

// A bar pinned to the bottom of the phone screen, so the easiest way in is always one tap away while people read the plans.
export default function StickyStart({ onboarding }: { onboarding: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,.08)] backdrop-blur lg:hidden">
      <form method="post" action="/app/subscribe/checkout" className="mx-auto max-w-md">
        <input type="hidden" name="plan" value="side" />
        {onboarding && <input type="hidden" name="onboarding" value="1" />}
        <SubmitButton pendingLabel="Taking you to secure payment…" className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-yebo px-5 py-3 text-base font-extrabold text-white transition hover:bg-yebo-deep">
          Start for {priceLabel("side")} a month
        </SubmitButton>
        <p className="mt-1.5 text-center text-xs font-semibold text-ink/60">Price of a cold drink and a pie · cancel any time</p>
      </form>
    </div>
  );
}
