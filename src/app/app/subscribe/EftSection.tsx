import { createClient } from "@/lib/supabase/server";
import { eftDetails, eftReference } from "@/lib/eft";
import { PLANS, PLAN_ORDER, priceLabel } from "@/lib/plans";
import { SUPPORT } from "@/lib/support";
import SubmitButton from "@/components/SubmitButton";
import { requestEft } from "./eft-actions";

// For the person whose card will not go through: pay by EFT, send the proof, and get connected once you confirm it.
// Hidden until the bank details are set in Vercel.
export default async function EftSection() {
  const bank = eftDetails();
  if (!bank) return null;
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("id,name").maybeSingle();
  if (!business) return null;
  const { data: pending } = await supabase.from("eft_payments").select("plan,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();

  const reference = eftReference(business.id);
  const whatsapp = `https://wa.me/${SUPPORT.whatsappDigits}?text=${encodeURIComponent(`Hi Yebo, I paid my plan by EFT. Business: ${business.name}. Reference: ${reference}. Proof of payment attached.`)}`;
  const row = "flex items-baseline justify-between gap-4 border-t border-yebo-deep/10 py-2 text-sm first:border-t-0";

  return (
    <details open={Boolean(pending)} className="mt-10 max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
      <summary className="cursor-pointer text-base font-extrabold text-yebo-deep">Card not working? Pay by EFT instead</summary>
      <div className="mt-4">
        <p className="text-sm leading-6 text-ink/70">Pay the plan you want into our account, send us the proof of payment on WhatsApp, and we switch your plan on as soon as we see the money. EFT is paid month by month, so we will remind you before each month ends.</p>

        <dl className="mt-4 rounded-xl bg-yebo-chalk p-4">
          <div className={row}><dt className="text-ink/60">Bank</dt><dd className="font-bold text-yebo-deep">{bank.bank}</dd></div>
          <div className={row}><dt className="text-ink/60">Account holder</dt><dd className="font-bold text-yebo-deep">{bank.holder}</dd></div>
          <div className={row}><dt className="text-ink/60">Account number</dt><dd className="font-bold tabular-nums text-yebo-deep">{bank.account}</dd></div>
          <div className={row}><dt className="text-ink/60">Account type</dt><dd className="font-bold text-yebo-deep">{bank.type}</dd></div>
          {bank.branch && <div className={row}><dt className="text-ink/60">Branch code</dt><dd className="font-bold tabular-nums text-yebo-deep">{bank.branch}</dd></div>}
          <div className={row}><dt className="text-ink/60">Your reference</dt><dd className="font-extrabold tabular-nums text-orange">{reference}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-ink/55">Please use your reference exactly as shown, so we can find your payment.</p>

        {pending ? (
          <p role="status" className="mt-5 rounded-xl bg-lime/30 p-4 text-sm font-semibold text-ink">
            Thank you. We have your notice for {PLANS[pending.plan as keyof typeof PLANS]?.name ?? "your plan"}. As soon as we see the payment your plan is switched on, usually the same day. Send your proof of payment on WhatsApp if you have not yet.
          </p>
        ) : (
          <form action={requestEft} className="mt-5">
            <fieldset>
              <legend className="text-sm font-bold text-ink">Which plan did you pay for?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PLAN_ORDER.map((id, index) => (
                  <label key={id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-yebo-deep/15 p-3 text-sm has-[:checked]:border-yebo has-[:checked]:bg-yebo-chalk">
                    <input type="radio" name="plan" value={id} defaultChecked={index === 1} className="accent-[#0F8A5F]" />
                    <span><b>{PLANS[id].name}</b><br />{priceLabel(id)} a month</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton pendingLabel="Sending…" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-yebo px-6 text-sm font-bold text-white transition hover:bg-yebo-deep">
              I have paid, please connect me
            </SubmitButton>
          </form>
        )}

        <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center rounded-md border-2 border-yebo-deep/25 px-6 text-sm font-bold text-yebo-deep transition hover:bg-yebo-chalk">
          Send proof of payment on WhatsApp
        </a>
      </div>
    </details>
  );
}
