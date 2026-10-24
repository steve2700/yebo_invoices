import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

// Shown the instant you tap a page, until its data arrives. Shaped like the dashboard so nothing jumps when it loads.
export default function Loading() {
  return (
    <LoadingShell className="min-h-full bg-paper px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3">
          <S className="h-3 w-40 rounded-full" />
          <S className="h-10 w-3/4 max-w-md rounded-xl" />
          <S className="h-4 w-56 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <S className="col-span-2 h-28 rounded-3xl sm:col-span-1" />
          <S className="h-28 rounded-3xl" />
          <S className="h-28 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,.75fr)]">
          <div className="flex flex-col gap-2.5 rounded-3xl border border-ink/10 bg-white p-4 sm:p-6">
            <S className="mb-2 h-6 w-48 rounded-lg" />
            <S className="h-16 rounded-2xl" />
            <S className="h-16 rounded-2xl" />
            <S className="h-16 rounded-2xl" />
          </div>
          <S className="h-56 rounded-3xl" />
        </div>
      </div>
    </LoadingShell>
  );
}
