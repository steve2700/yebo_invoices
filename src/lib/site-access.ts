import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";
import { waLink } from "@/lib/dates";
import { greetingName } from "@/lib/names";
import { isEmail, renderEmail, sendEmail } from "@/lib/email";

// The client says where to come and how to get in. Only for an accepted quote. The owner is told by email right away.
// Returns an error message for the client, or null when it worked. Never throws.
export async function saveSiteAccess(token: string, raw: string): Promise<string | null> {
  try {
    const text = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, 400) : "";
    if (text.length < 5) return "Please type the address and anything we need to get in.";
    const admin = createAdminClient();
    const { data: doc } = await admin.from("documents").select("id,number,type,status,site_access,site_access_at,business_id,client_id").eq("public_token", token).maybeSingle();
    if (!doc || doc.type !== "quote" || !["accepted", "paid"].includes(doc.status)) return "This can only be sent after the quote is accepted.";
    if (doc.site_access === text) return null;
    // A few edits are fine, a flood is not.
    if (doc.site_access_at && Date.now() - new Date(doc.site_access_at).getTime() < 20 * 1000) return "Please wait a moment and try again.";
    const { error } = await admin.from("documents").update({ site_access: text, site_access_at: new Date().toISOString() }).eq("id", doc.id);
    if (error) return "Something went wrong. Please try again.";

    const [{ data: business }, { data: client }] = await Promise.all([
      admin.from("businesses").select("name,email,owner_id,brand_color").eq("id", doc.business_id).maybeSingle(),
      admin.from("clients").select("name,whatsapp_number").eq("id", doc.client_id).maybeSingle(),
    ]);
    if (business) {
      let to = isEmail(business.email) ? business.email.trim() : "";
      if (!to && business.owner_id) { const { data: o } = await admin.auth.admin.getUserById(business.owner_id); to = o?.user?.email ?? ""; }
      if (to) {
        const first = greetingName(client?.name);
        await sendEmail({
          to, fromName: "Yebo Invoices", idempotencyKey: `site-access/${doc.id}/${Date.now() % 1000000}`,
          subject: `${client?.name ?? "Your client"} sent the site address for ${doc.number}`,
          html: renderEmail({
            brandColor: business.brand_color,
            heading: `${client?.name ?? "Your client"} sent the site details`,
            intro: text,
            rows: [["Client", client?.name ?? "-"], ["Quote", doc.number]],
            buttonLabel: "Open the quote", buttonUrl: `${appUrl()}/app/documents/${doc.id}`,
            secondaryButtonLabel: `Message ${first} on WhatsApp`,
            secondaryButtonUrl: waLink(client?.whatsapp_number ?? null, `Hi ${first}, thanks for the address. We have it and will see you soon.`),
            footer: null,
          }),
        });
      }
    }
    return null;
  } catch (e) {
    console.error("[site-access] failed:", e);
    return "Something went wrong. Please try again.";
  }
}
