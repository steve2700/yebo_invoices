import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <S className="h-9 w-36 rounded-xl" />
        <S className="h-11 w-32 rounded-full" />
      </div>
      <S className="mt-5 h-20 rounded-2xl" />
      <S className="mt-3 h-20 rounded-2xl" />
      <S className="mt-8 h-3 w-24 rounded-full" />
      <div className="mt-3 flex flex-col gap-3">
        <S className="h-28 rounded-2xl" />
        <S className="h-28 rounded-2xl" />
      </div>
    </LoadingShell>
  );
}
