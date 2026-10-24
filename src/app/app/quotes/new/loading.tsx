import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-9 w-44 rounded-xl" />
      <S className="mt-6 h-24 rounded-3xl" />
      <div className="mt-4 flex flex-col gap-3">
        <S className="h-12 rounded-xl" />
        <S className="h-12 rounded-xl" />
        <S className="h-32 rounded-2xl" />
        <S className="h-12 rounded-xl" />
      </div>
    </LoadingShell>
  );
}
