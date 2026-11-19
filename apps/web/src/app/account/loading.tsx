import { SkeletonBlock } from "../../components/skeleton";

export default function LoadingAccount() {
  return (
    <div className="shell py-10">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <div className="space-y-3">
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-6">
          <SkeletonBlock className="h-7 w-48" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
