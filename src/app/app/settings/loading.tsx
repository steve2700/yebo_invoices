import { LoadingShell, Skeleton as S } from "@/components/Skeleton";

export default function Loading() {
  return (
    <LoadingShell className="min-h-[calc(100vh-65px)] bg-yebo-chalk px-5 py-8 sm:py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <S className="h-4 w-36 rounded-full" />
          <S className="h-10 w-2/3 max-w-sm rounded-xl" />
          <S className="h-4 w-3/4 max-w-md rounded-full" />
        </div>
        <S className="h-40 rounded-3xl" />
        <S className="h-64 rounded-3xl" />
        <S className="h-64 rounded-3xl" />
      </div>
    </LoadingShell>
  );
}
