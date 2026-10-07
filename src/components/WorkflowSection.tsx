const steps = [
  {
    number: "01",
    title: "Create a quote",
    detail: "Add the client, job, line items and payment terms — or start with a voice note.",
    label: "A clear first draft",
  },
  {
    number: "02",
    title: "Share one link",
    detail: "Send it by email, copy the client link or open a WhatsApp message ready to review.",
    label: "Easy to open",
  },
  {
    number: "03",
    title: "Get a decision",
    detail: "Your client can review the details and accept or decline online. See document activity, too.",
    label: "Yes or no, clearly",
  },
  {
    number: "04",
    title: "Make the invoice",
    detail: "Turn an accepted quote into an invoice with a due date and your EFT details.",
    label: "No retyping the job",
  },
];

export default function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 border-y border-yebo-deep/10 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-yebo">A simple flow, all the way through</p>
            <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.06em] text-yebo-deep sm:text-5xl">
              From first draft to invoice.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-yebo-deep/65 lg:justify-self-end lg:text-base">
            Keep the work moving with one connected process: put the job in writing, make it easy to review, and carry the accepted details forward.
          </p>
        </div>

        <ol className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number} className="flex min-h-56 flex-col rounded-[1.5rem] border border-yebo-deep/10 bg-yebo-chalk/70 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-yebo">{step.number}</span>
                <span aria-hidden="true" className="size-2 rounded-full bg-yebo-sun" />
              </div>
              <h3 className="mt-7 text-xl font-extrabold tracking-tight text-yebo-deep">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-yebo-deep/65">{step.detail}</p>
              <p className="mt-5 border-t border-yebo-deep/10 pt-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-yebo-deep/45">{step.label}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
