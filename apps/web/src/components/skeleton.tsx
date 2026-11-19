/** Shimmer placeholders used by the route-level loading.tsx files. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div>
      <SkeletonBlock className="aspect-[4/5] w-full rounded-2xl" />
      <SkeletonBlock className="mt-3.5 h-2.5 w-16" />
      <SkeletonBlock className="mt-2 h-3 w-3/4" />
      <SkeletonBlock className="mt-2 h-3 w-20" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:gap-x-6 lg:grid-cols-3" aria-busy="true" aria-label="در حال بارگذاری محصولات">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="shell py-10 md:py-14">
        <SkeletonBlock className="h-2.5 w-40" />
        <SkeletonBlock className="mt-5 h-8 w-64 max-w-full" />
        <SkeletonBlock className="mt-4 h-3 w-full max-w-md" />
      </div>
    </div>
  );
}
