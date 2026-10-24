import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <S className="h-4 w-24 rounded-full" />
      <S className="mt-4 h-9 w-48 rounded-xl" />
      <S className="mt-3 h-4 w-full max-w-md rounded-full" />
      <S className="mt-5 h-16 rounded-3xl" />
      <div className="mt-6 flex gap-2"><S className="h-11 w-36 rounded-full" /><S className="h-11 w-40 rounded-full" /></div>
      <div className="mt-4 flex flex-col gap-2"><S className="h-11 rounded-xl" /><S className="h-11 rounded-xl" /></div>
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => <S key={i} className="h-40 rounded-2xl" />)}
      </div>
    </LoadingShell>
  );
}
