import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-4 w-24 rounded-full" />
      <S className="mt-4 h-9 w-2/3 max-w-md rounded-xl" />
      <S className="mt-3 h-4 w-1/2 max-w-sm rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <S key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 7 }, (_, i) => <S key={i} className="h-12 rounded-xl" />)}
      </div>
    </LoadingShell>
  );
}
