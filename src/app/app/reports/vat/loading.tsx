import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-9 w-56 rounded-xl" />
      <S className="mt-3 h-4 w-full max-w-md rounded-full" />
      <S className="mt-6 h-24 rounded-3xl" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <S key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => <S key={i} className="h-12 rounded-xl" />)}
      </div>
    </LoadingShell>
  );
}
