import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm tracking-[0.3em] text-[var(--accent)]">ADMIN</p>
      <h1 className="mt-4 text-4xl font-semibold">پنل مدیریت — Sprint 4</h1>
      <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--panel)] p-6 text-slate-300">
        CMS/Page Builder پایه (DB-backed) اضافه شده است. تغییرات صفحه در API/DB ذخیره و در storefront رندر می‌شوند.
      </div>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/login" className="rounded-xl bg-sky-400 px-4 py-2 font-medium text-slate-900">Login</Link>
        <Link href="/cms/pages" className="rounded-xl border border-white/15 px-4 py-2">CMS Pages</Link>
      </div>
    </main>
  );
}
