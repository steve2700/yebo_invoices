import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-9 w-44 rounded-xl" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <S className="size-11 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <S className="h-4 w-1/2 rounded-full" />
              <S className="h-3 w-1/3 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <S className="h-4 w-20 rounded-full" />
              <S className="h-3 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
