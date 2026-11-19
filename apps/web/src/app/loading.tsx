import { ProductGridSkeleton, SkeletonBlock } from "../components/skeleton";

/** Global fallback; routes with their own loading.tsx take precedence. */
export default function LoadingRoot() {
  return (
    <div className="shell section">
      <SkeletonBlock className="h-2.5 w-32" />
      <SkeletonBlock className="mt-5 h-10 w-80 max-w-full" />
      <SkeletonBlock className="mt-4 h-3 w-full max-w-lg" />
      <SkeletonBlock className="mt-8 h-11 w-40 rounded-full" />
      <div className="mt-16">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}
