import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm tracking-[0.3em] text-[var(--accent)]">AGHACI</p>
      <h1 className="mt-4 text-5xl font-semibold">فروشگاه مد پوشاک — Sprint 3 Catalog</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
        کاتالوگ، واریانت/ویژگی، فیلتر/مرتب‌سازی، autocomplete API و صفحات واقعی محصولات به API متصل شده‌اند.
        در اسپرینت‌های بعدی سبد خرید، CMS/Page Builder واقعی و سفارش تکمیل می‌شود.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/products" className="rounded-xl bg-stone-900 px-5 py-3 text-white">مشاهده محصولات</Link>
      </div>
    </main>
  );
}
