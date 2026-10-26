import Link from "next/link";
import Icon from "./icons";
import { readyReminders } from "@/lib/reminders-count";

// The bell in the top bar: always one tap to the reminders, with a number when some are ready.
export default async function RemindersBell() {
  const { allowed, items } = await readyReminders();
  if (!allowed) return null;
  const count = items.length;
  return (
    <Link
      href="/app/reminders"
      aria-label={count ? `Reminders: ${count} ready to send` : "Reminders"}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-yebo-deep/70 hover:bg-yebo-deep/5 hover:text-yebo-deep"
    >
      <Icon name="bell" size={22} />
      {count > 0 && (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-orange px-1 text-[10px] font-black leading-[18px] text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
