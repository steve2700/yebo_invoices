"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  pendingLabel: string; // what the button says while it is working, for example "Creating your invoice…"
  className?: string;
};

// A submit button that shows a spinner and a clear message while it works, and cannot be tapped twice.
export default function SubmitButton({ children, pendingLabel, className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-70`}>
      {pending ? (
        <span className="inline-flex items-center gap-2" role="status">
          <span aria-hidden="true" className="spin inline-block size-4 rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
