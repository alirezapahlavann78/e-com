import { PageHeaderSkeleton, ProductGridSkeleton, SkeletonBlock } from "../../components/skeleton";

export default function LoadingProducts() {
  return (
    <div className="pb-16">
      <PageHeaderSkeleton />
      <div className="shell pt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="space-y-8">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-24" />
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-3 w-32" />
              ))}
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-8 w-8 rounded-full" />
                ))}
              </div>
            </div>
            <SkeletonBlock className="h-9 w-full" />
            <SkeletonBlock className="h-9 w-full" />
          </div>
        </aside>
        <section>
          <div className="mb-6 flex items-center justify-between">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-32 rounded-full" />
          </div>
          <ProductGridSkeleton />
        </section>
      </div>
    </div>
  );
}
