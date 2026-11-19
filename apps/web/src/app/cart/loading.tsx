import { SkeletonBlock } from "../../components/skeleton";

export default function LoadingCart() {
  return (
    <div className="shell py-10">
      <SkeletonBlock className="h-9 w-40" />
      <SkeletonBlock className="mt-3 h-3 w-24" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div className="space-y-5 border-y border-[var(--line)] py-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <SkeletonBlock className="h-32 w-24 rounded-xl" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-3 w-1/2" />
                <SkeletonBlock className="h-2.5 w-24" />
                <SkeletonBlock className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="card space-y-3 p-6">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-2/3" />
          <SkeletonBlock className="mt-3 h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
