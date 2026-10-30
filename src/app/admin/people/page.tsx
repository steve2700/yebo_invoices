import { loadAdminData } from "@/lib/admin-data";
import { formatSouthAfricaDateTime } from "@/lib/time";
import { waLink } from "@/lib/dates";
import { card, link, PageHead, Section, td, th } from "../ui";

export default async function People() {
  const d = await loadAdminData();
  return (
    <>
      <PageHead title="People to follow up" note="Real people who started and then stopped. One tap writes the message for you; you press send." />
      <Section title={"Signed up, never finished onboarding (" + d.notOnboarded.length + ")"} note="Accounts older than 30 minutes with no business set up. Newest first.">
        <div className={card + " overflow-x-auto"}>
          {d.notOnboarded.length === 0 ? <p className="text-sm text-yebo-deep/60">Nobody is stuck here.</p> : (
            <table className="w-full min-w-[620px]">
              <thead><tr><th className={th}>Email</th><th className={th}>Signed up</th><th className={th}>Last sign-in</th><th className={th}>How</th><th className={th}>Contact</th></tr></thead>
              <tbody>
                {d.notOnboarded.map((u) => (
                  <tr key={u.id} className="border-t border-yebo-deep/10">
                    <td className={td + " break-all"}>{u.email ?? "(no email)"}</td>
                    <td className={td}>{formatSouthAfricaDateTime(u.created_at)}</td>
                    <td className={td}>{u.last_sign_in_at ? formatSouthAfricaDateTime(u.last_sign_in_at) : "never"}</td>
                    <td className={td}>{u.app_metadata?.provider ?? "email"}</td>
                    <td className={td}>{u.email ? <a className={link} href={"mailto:" + u.email + "?subject=" + encodeURIComponent("Your Yebo account") + "&body=" + encodeURIComponent("Hi, this is Yebo Invoices. I saw you created an account but have not finished setting up your business. Can I help you get started? It takes about 2 minutes.")}>Email</a> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
      <Section title={"Set up, but no quote sent after 2 days (" + d.noSentQuote.length + ")"}>
        <div className={card + " overflow-x-auto"}>
          {d.noSentQuote.length === 0 ? <p className="text-sm text-yebo-deep/60">Everyone has sent a quote.</p> : (
            <table className="w-full min-w-[620px]">
              <thead><tr><th className={th}>Business</th><th className={th}>Email</th><th className={th}>Created</th><th className={th}>WhatsApp</th><th className={th}>Email</th></tr></thead>
              <tbody>
                {d.noSentQuote.map((b) => {
                  const mail = b.email || d.userEmail.get(b.owner_id);
                  return (
                    <tr key={b.id} className="border-t border-yebo-deep/10">
                      <td className={td + " font-bold"}>{b.name}</td>
                      <td className={td + " break-all"}>{mail || "-"}</td>
                      <td className={td}>{formatSouthAfricaDateTime(b.created_at)}</td>
                      <td className={td}>{b.phone ? <a className={link} target="_blank" rel="noreferrer" href={waLink(b.phone, "Hi " + b.name + ", this is Yebo Invoices. I saw you set up your account but have not sent your first quote yet. Can I help you get it out?")}>WhatsApp</a> : "no phone"}</td>
                      <td className={td}>{mail ? <a className={link} href={"mailto:" + mail + "?subject=" + encodeURIComponent("Your first quote on Yebo") + "&body=" + encodeURIComponent("Hi " + b.name + ", this is Yebo Invoices. I saw you set up your account but have not sent your first quote yet. Can I help you get it out?")}>Email</a> : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </>
  );
}
