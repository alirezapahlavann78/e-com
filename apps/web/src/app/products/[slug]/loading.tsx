import { SkeletonBlock } from "../../../components/skeleton";

export default function LoadingProduct() {
  return (
    <div className="shell pb-16 pt-6">
      <SkeletonBlock className="h-2.5 w-52" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <SkeletonBlock className="aspect-[4/5] w-full rounded-3xl" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-14 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-2.5 w-20" />
          <SkeletonBlock className="h-9 w-3/4" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-5/6" />
          <SkeletonBlock className="mt-6 h-6 w-32" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-12 rounded-lg" />
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-12 w-full rounded-full" />
          <SkeletonBlock className="h-10 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
