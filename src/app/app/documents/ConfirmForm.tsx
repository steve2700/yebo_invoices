"use client";

// A small form button that asks "are you sure?" before running a server action.
export default function ConfirmForm({ action, id, message, label, className }: {
  action: (fd: FormData) => void | Promise<void>; id: string; message: string; label: string; className?: string;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className={className}>{label}</button>
    </form>
  );
}
