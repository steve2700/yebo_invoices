import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-4 w-28 rounded-full" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <S className="h-9 w-40 rounded-xl" />
        <S className="h-8 w-24 rounded-full" />
      </div>
      <S className="mt-6 h-64 rounded-3xl" />
      <div className="mt-4 grid grid-cols-2 gap-3"><S className="h-12 rounded-xl" /><S className="h-12 rounded-xl" /></div>
      <S className="mt-4 h-40 rounded-3xl" />
    </LoadingShell>
  );
}
