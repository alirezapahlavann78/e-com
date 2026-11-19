import { PageHeaderSkeleton, ProductGridSkeleton } from "../../../components/skeleton";

export default function LoadingCategory() {
  return (
    <div className="pb-16">
      <PageHeaderSkeleton />
      <div className="shell pt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="hidden lg:block" />
        <section>
          <ProductGridSkeleton />
        </section>
      </div>
    </div>
  );
}
