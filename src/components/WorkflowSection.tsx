const steps = [
  { title: "Create a quote", detail: "Add the client, the job, the line items and the payment terms, or start with a voice note." },
  { title: "Share one link", detail: "Send it by email, copy the client link, or open a WhatsApp message that is ready to review." },
  { title: "Get a decision", detail: "Your client reads it online and accepts with their name, asks for a change, or says why not. You see every open and every answer." },
  { title: "Make the invoice", detail: "Turn the accepted quote into an invoice with a due date and your EFT details. Any deposit is credited for you." },
];

export default function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 border-t border-yebo-deep/10 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-2xl text-balance text-3xl font-extrabold leading-[1.02] tracking-[-.04em] text-yebo-deep sm:text-5xl">From first draft to invoice</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-yebo-deep/75">One connected process, so the details you put in once carry through to the invoice.</p>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="border-t-2 border-yebo-deep pt-4">
              <p className="text-sm font-bold text-yebo">Step {i + 1}</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-yebo-deep">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-yebo-deep/75">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
