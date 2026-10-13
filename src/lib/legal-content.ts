import { PRO_PRICE_LABEL } from "@/lib/plans";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type LegalDocument = {
  slug: "privacy" | "terms";
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  sections: readonly LegalSection[];
};

export const legalContact: {
  legalName: string | null;
  registeredAddress: string | null;
  contactEmail: string | null;
} = {
  // Set LEGAL_NAME, LEGAL_ADDRESS and CONTACT_EMAIL in your hosting environment variables.
  legalName: process.env.LEGAL_NAME?.trim() || null,
  registeredAddress: process.env.LEGAL_ADDRESS?.trim() || null,
  contactEmail: process.env.CONTACT_EMAIL?.trim() || null,
};

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  eyebrow: "Privacy · POPIA",
  title: "Your information, handled with care.",
  description:
    "This notice explains what Yebo Invoices handles when you create business documents, share them with clients, take payments, or use AI-assisted drafting.",
  updated: "12 October 2026",
  sections: [
    {
      id: "scope",
      title: "About this notice",
      paragraphs: [
        "This Privacy Policy applies to the Yebo Invoices website and app (together, Yebo). It describes how personal information is collected, used, stored, and shared when you use the service.",
        "Yebo is designed for small businesses. When a business enters information about its customers, that business decides why the information is used and is responsible for having a lawful basis to use it. This notice also explains how Yebo handles account and service information.",
      ],
    },
    {
      id: "information",
      title: "Information we handle",
      paragraphs: [
        "We handle information you provide, information created as you use Yebo, and limited technical information processed by the providers that operate the service.",
      ],
      bullets: [
        "Account and sign-in information, such as your email address and account and session details managed through Supabase Auth. If you choose Google sign-in, Google also provides basic account information needed to authenticate you.",
        "Business profile information, such as your business name, email, phone number, website, address, company or VAT registration details, optional banking details, logo, brand colour, and quote settings.",
        "Client and document information, such as client names, phone or WhatsApp numbers, email addresses and addresses; job descriptions and locations; quote and invoice line items, prices, tax, dates, payment terms, notes, and document status or response events.",
        "Information you choose to submit to AI features, including typed work details and voice recordings. A voice recording is transcribed to return an editable quote draft.",
        "Payment information: if you connect PayFast, we store your PayFast merchant details securely on our server. When a client pays an invoice through PayFast, we receive the status, amount and PayFast reference of the payment. We do not receive or store card numbers.",
        "Subscription information: your plan, its status and billing dates. Card or bank details for your Yebo subscription are handled by PayFast, not stored by Yebo.",
        "Targets and progress: the monthly money and quote targets you set, which are used to show your progress.",
        "Basic technical and security information that hosting, authentication, and other service providers may process to deliver and protect the website, such as request timestamps, browser information, and network information.",
      ],
    },
    {
      id: "use",
      title: "How we use information",
      paragraphs: [
        "We use information only as needed to provide and protect Yebo, including to:",
      ],
      bullets: [
        "Create and secure accounts, remember business settings, and provide customer support.",
        "Prepare, store, display, and export the quotes and invoices you request.",
        "Send a document and its PDF to the recipient when you choose the email option, and provide a public document link when you share one.",
        "Send you service emails, such as a notice when a client accepts a quote or pays an invoice, and send your client a receipt when they pay.",
        "Pass a client's payment to PayFast when they choose to pay online, and record the payment once PayFast confirms it.",
        "Generate AI-assisted messages, transcriptions, or quote drafts when you choose those features.",
        "Record document events such as sending, viewing, acceptance, decline, or a payment entry; prevent misuse; diagnose service issues; and meet legal obligations.",
      ],
    },
    {
      id: "business-data",
      title: "Client and business information",
      paragraphs: [
        "You control the business and client information you enter. Before uploading or sharing someone else's information, make sure you are allowed to do so, provide any notice required by law, and keep the information accurate and limited to what the service needs.",
        "Yebo processes client and document information to provide the features you request, maintain the service, and protect it. You remain responsible for your relationship with your clients, your privacy notices, and responding to requests that relate to information you control.",
      ],
    },
    {
      id: "public-documents",
      title: "Public quote and invoice links",
      paragraphs: [
        "When you share a Yebo quote or invoice link, anyone who has that link may be able to view the document and download its PDF. The document may show the client's name, job details, prices, payment terms, your business details, and any banking details included on the page. A recipient may forward or save the link.",
        "Yebo records document events such as a page view or a quote response so the business can follow the document's progress. Treat each public link as a shareable link, and send it only to the intended recipient.",
      ],
    },
    {
      id: "ai-features",
      title: "AI-assisted features",
      paragraphs: [
        "If you choose an AI feature, the information needed for that request is sent to Groq, our AI provider, to generate a draft, a tidied piece of text or a transcription. Depending on the feature, this may include a voice recording or transcript, business name, item descriptions, and job details.",
        "The voice-drafting feature returns a transcript and editable draft to your browser; it does not add the recording or transcript to your saved Yebo documents by default. AI providers may process or retain request information under their own current terms and retention practices. Avoid including sensitive details that are not needed, and review every generated result before using or sharing it.",
      ],
    },
    {
      id: "service-providers",
      title: "Service providers and other disclosures",
      paragraphs: [
        "We use third-party providers to run Yebo and deliver features. Based on the current service, these include Supabase for authentication, database, and logo storage; Vercel for hosting; Groq for AI requests; Resend to deliver emails and attached PDFs; and PayFast to process online payments and subscription payments.",
        "WhatsApp buttons in Yebo only open WhatsApp on your own device with a message already written. Yebo does not send WhatsApp messages on your behalf. WhatsApp's own terms and privacy notice apply to anything you send there.",
        "We may also disclose information when needed to comply with law, respond to valid legal requests, protect users and the service, or transfer the service as part of a business reorganisation. We do not sell personal information for advertising.",
      ],
    },
    {
      id: "international-processing",
      title: "Where information is processed",
      paragraphs: [
        "Our providers may process information in countries other than South Africa. Their locations and infrastructure can change. Where applicable, we take steps intended to meet the requirements for cross-border transfers under South African privacy law and require service providers to handle information under their applicable terms.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and sign-in sessions",
      paragraphs: [
        "Yebo uses essential session cookies to keep you signed in and support protected pages. The current app does not intentionally use advertising cookies or third-party ad tracking. Blocking essential cookies may prevent sign-in or parts of the service from working.",
      ],
    },
    {
      id: "retention",
      title: "Retention and deletion requests",
      paragraphs: [
        "We keep account, business, client, and document information while it is needed to provide the service, while your account is active, and for any additional period required for security, dispute resolution, or legal obligations. Backups and provider logs may remain for a limited period under the provider's retention practices.",
        "The current app does not include a self-service account deletion control. You may request access, correction, or deletion using the service contact details at the end of this notice. Some information may need to be retained where the law permits or requires it.",
      ],
    },
    {
      id: "security",
      title: "Security",
      paragraphs: [
        "We use access controls and the security features provided by our infrastructure providers to protect information. No website or storage system can be guaranteed completely secure, so please protect your sign-in method and tell us promptly if you believe your account has been accessed without permission.",
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      paragraphs: [
        "Subject to applicable law, you may request access to or correction or deletion of personal information, object to or limit certain processing, and ask questions about how information is handled. Contact details for Yebo are listed below. We may need to verify your identity and clarify the request before responding.",
        "If you are in South Africa, you may also raise a complaint with the Information Regulator of South Africa. A business user's client should direct a request about a quote or invoice to the business that created and shared it.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paragraphs: [
        "Yebo is a business service and is not designed for children. We do not knowingly invite children to create accounts. If you believe a child has provided personal information to Yebo, contact us using the details below.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this notice as Yebo changes. The updated date at the top of this page shows when the current version was published. If a change materially affects how information is handled, we will take reasonable steps to provide notice through the service.",
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  slug: "terms",
  eyebrow: "Terms · Yebo Invoices",
  title: "Good work starts with clear terms.",
  description:
    "These terms cover your use of Yebo Invoices, from preparing a quote to sharing a finished invoice with a client.",
  updated: "12 October 2026",
  sections: [
    {
      id: "agreement",
      title: "Agreement and eligibility",
      paragraphs: [
        "These Terms of Service apply when you visit or use Yebo Invoices (Yebo), including its website, app, and document-sharing features. By creating an account or using the service, you agree to these terms and the Privacy Policy.",
        "Yebo is intended for business use. You must be at least 18 and have authority to create an account and act for the business you represent. If you do not agree to these terms, do not use the service.",
      ],
    },
    {
      id: "accounts",
      title: "Your account",
      paragraphs: [
        "You are responsible for providing accurate account and business information, protecting your sign-in access, and activity carried out through your account. Tell us promptly if you suspect unauthorised access. Do not share access in a way that compromises your business or client information.",
        "You may use Yebo only for a business you own or are authorised to represent. You are responsible for ensuring that other people using the account are permitted to do so.",
      ],
    },
    {
      id: "service",
      title: "What Yebo provides",
      paragraphs: [
        "Yebo provides tools to manage business details and clients, prepare quotes and invoices, create PDFs, share documents, collect a quote response, and record payment information. Some features can prepare AI-assisted text or an editable draft from a voice recording. Yebo also lets clients pay invoices online through PayFast and shows you monthly targets and progress.",
        "We may update, add, limit, or discontinue features to maintain or improve the service. We aim to keep Yebo available but do not promise uninterrupted access or that every feature will be available at all times.",
      ],
    },
    {
      id: "your-documents",
      title: "Quotes, invoices, and business decisions",
      paragraphs: [
        "You are responsible for checking every quote and invoice before sending it. Confirm the recipient, work description, quantities, prices, dates, bank details, payment terms, VAT treatment, and any legal wording. Yebo's calculations and document templates are tools, not accounting, legal, or tax advice.",
        "You remain responsible for deciding whether a client's acceptance forms a contract and for agreeing the scope of work, payment arrangements, warranties, and any other terms with that client. A status recorded on a Yebo page is a service record; it is not a substitute for any separate agreement or signature your business needs.",
        "Yebo can display bank details you enter and lets you record an EFT or cash payment manually. A payment you record yourself is not independent confirmation that funds reached your account.",
      ],
    },
    {
      id: "online-payments",
      title: "Online payments through PayFast",
      paragraphs: [
        "If you connect your own PayFast account, your clients can pay your invoices by card or instant EFT. The payment goes from your client to your PayFast account. Yebo does not receive, hold or pay out those funds.",
        "Yebo marks an invoice as paid only after PayFast confirms the payment to us. PayFast charges its own fees to you, and PayFast's terms apply to the payment. You are responsible for your own PayFast account, for any refund or dispute with your client, and for keeping your PayFast details correct.",
        "While you are in test mode, no real money moves, and payments are for practice only.",
      ],
    },
    {
      id: "messages",
      title: "Emails and WhatsApp messages",
      paragraphs: [
        "You are responsible for the content of the messages you send to your clients and for having a proper reason and permission to contact them. Use Yebo to send the quotes, invoices and reminders your clients expect, and not to send unrelated marketing.",
        "AI can draft a message for you, but you always read it first, and nothing is sent to a client until you choose to send it.",
      ],
    },
    {
      id: "sharing",
      title: "Sharing documents with clients",
      paragraphs: [
        "A public quote or invoice link can be viewed by anyone who has the link and may be forwarded or saved. Check the document before sharing it and send the link only to its intended recipient. You are responsible for the information you choose to include, including client details and banking details.",
        "When you email a document through Yebo, the service sends the document and PDF to the email address you enter using a third-party email provider. You are responsible for confirming that the address is correct and that you may send the information to that recipient.",
      ],
    },
    {
      id: "ai",
      title: "AI-generated drafts",
      paragraphs: [
        "AI features provide suggestions and editable drafts. They can be incomplete, inaccurate, or unsuitable for your situation. Review and correct a draft before using, relying on, or sending it. AI output is not professional, legal, financial, or tax advice and does not replace your own judgement.",
        "When you use an AI feature, relevant text or voice content is processed by third-party AI providers as described in the Privacy Policy. Do not submit information you are not authorised to share.",
      ],
    },
    {
      id: "content-rights",
      title: "Your content and our service",
      paragraphs: [
        "You keep your rights to the business information, logo, client details, and documents you provide. You give Yebo permission to host, store, process, display, and transmit that content only as reasonably needed to operate, secure, and provide the features you request.",
        "Yebo and its licensors retain rights to the service, software, design, and branding. These terms do not transfer ownership of those materials to you. You may not copy, resell, reverse engineer, or misuse the service except where applicable law allows.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      paragraphs: [
        "You must use Yebo lawfully and respect other people's rights. You must not use the service to send deceptive, unlawful, or unauthorised documents; expose information you do not have permission to share; interfere with security or availability; upload malicious material; or attempt to access another person's account or data.",
      ],
    },
    {
      id: "third-party-services",
      title: "Third-party services",
      paragraphs: [
        "Yebo relies on third-party services for hosting, sign-in, data storage, AI processing, email delivery, payments and messaging. Those providers may have their own terms and privacy notices. We are not responsible for services that we do not control, although this does not limit any responsibility that cannot legally be excluded.",
      ],
    },
    {
      id: "fees",
      title: "Fees and subscriptions",
      paragraphs: [
        `Yebo Pro costs ${PRO_PRICE_LABEL} per month. The price is shown before you subscribe. It is billed monthly in advance through PayFast and renews automatically each month until you cancel.`,
        "You can cancel at any time in Settings. After you cancel, you keep access until the end of the month you have already paid for, and you will not be charged again. We do not refund part-months unless the law requires it.",
        "If a payment fails, we may limit your ability to create new documents until it is sorted out. Your clients can still view and pay documents you have already sent, and you can still see and download your information.",
        "We will give you at least 30 days' notice before a price change takes effect for you. Payments are also subject to PayFast's terms.",
      ],
    },
    {
      id: "suspension",
      title: "Suspension and ending use",
      paragraphs: [
        "You may stop using Yebo at any time. We may suspend or restrict access where reasonably necessary to protect the service or users, respond to a legal requirement, address a security risk, or investigate a material breach of these terms. Where appropriate, we will try to give notice and an opportunity to resolve the issue.",
        "If you stop using the service, information may remain for the periods described in the Privacy Policy. The current app does not provide a self-service account deletion control; contact the service operator using the details below to ask about account or data deletion.",
      ],
    },
    {
      id: "disclaimers",
      title: "Service disclaimers",
      paragraphs: [
        "To the extent permitted by law, Yebo is provided as available and without a promise that it will meet every business requirement, be error-free, or remain available without interruption. Always retain your own business records and verify important information independently.",
      ],
    },
    {
      id: "liability",
      title: "Liability",
      paragraphs: [
        "To the extent permitted by applicable law, Yebo is not liable for indirect or consequential loss, lost profits, lost business opportunities, or loss caused by inaccurate information you provide, a recipient's use of a public link, a third-party service, or an interruption outside our reasonable control.",
        "Nothing in these terms limits liability or a consumer right that cannot lawfully be limited or excluded. Where the law allows a limit, Yebo's total liability for claims relating to the service will not exceed the amount you paid Yebo for the service in the 12 months before the event giving rise to the claim; if you paid nothing, the limit is the maximum allowed by law.",
      ],
    },
    {
      id: "law",
      title: "Governing law and updates",
      paragraphs: [
        "These terms are governed by the laws of the Republic of South Africa, subject to any mandatory consumer protections that apply to you. Any dispute will be handled by a court with jurisdiction under applicable law.",
        "We may update these terms as the service changes. The updated date at the top of this page shows when the current version was published. If a material change affects your use, we will take reasonable steps to notify you through the service.",
      ],
    },
  ],
};

export const legalSectionsForToc = (document: LegalDocument) => [
  ...document.sections.map(({ id, title }) => ({ id, title })),
  { id: "contact", title: "Operator and contact" },
];

export const legalContactIsIncomplete = () =>
  !legalContact.legalName || !legalContact.registeredAddress || !legalContact.contactEmail;
