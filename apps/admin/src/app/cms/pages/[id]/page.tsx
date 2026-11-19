"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi, faDateTime, storefrontBase } from "../../../../lib/api";
import { Badge, Button, Card, Input, Label, Select, Spinner, Textarea } from "../../../../components/ui";
import { IMAGE_SUGGESTIONS, SECTION_SCHEMAS, labelFor, schemaFor } from "../../../../lib/cms-sections";
import MediaPicker from "../../../../components/media-picker";

type SectionRow = { id?: string; type: string; isVisible: boolean; config: Record<string, any>; _key: string };
type Version = { id: string; version: number; label?: string | null; isPublished: boolean; createdAt: string; sections: { type: string; config: any; isVisible: boolean; sortOrder: number }[] };
type Page = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedVersion?: { id: string; sections: any[] } | null;
  draftVersion?: { id: string; sections: any[] } | null;
  versions?: Version[];
  updatedAt: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const toRows = (sections: any[] | undefined): SectionRow[] =>
  [...(sections ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((section) => ({ id: section.id, type: section.type, isVisible: section.isVisible ?? true, config: section.config ?? {}, _key: uid() }));

const PAGE_TYPES = ["HOME", "STATIC", "LANDING", "CUSTOM", "PRODUCT_TEMPLATE", "CATEGORY_TEMPLATE", "BRAND"];

export default function PageBuilder() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [meta, setMeta] = useState({ title: "", slug: "", type: "STATIC", metaTitle: "", metaDescription: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await adminApi<Page>(`/admin/cms/pages/${id}`);
      setPage(data);
      const rows = toRows(data.draftVersion?.sections?.length ? data.draftVersion.sections : data.publishedVersion?.sections);
      setSections(rows);
      setSelected(rows[0]?._key ?? null);
      setMeta({
        title: data.title,
        slug: data.slug,
        type: data.type,
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
      });
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: string, patch: Partial<SectionRow>) => {
    setSections((rows) => rows.map((row) => (row._key === key ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const updateConfig = (key: string, field: string, value: unknown) => {
    setSections((rows) =>
      rows.map((row) => (row._key === key ? { ...row, config: { ...row.config, [field]: value } } : row)),
    );
    setDirty(true);
  };

  const addSection = (type: string) => {
    const schema = schemaFor(type);
    const row: SectionRow = {
      _key: uid(),
      type,
      isVisible: true,
      config: { ...(schema?.defaults ?? {}) },
    };
    setSections((rows) => [...rows, row]);
    setSelected(row._key);
    setDirty(true);
    setLibraryOpen(false);
    setNotice(`بخش «${labelFor(type)}» اضافه شد — برای اعمال، پیش‌نویس را ذخیره کنید.`);
  };

  const removeSection = (key: string) => {
    setSections((rows) => rows.filter((row) => row._key !== key));
    if (selected === key) setSelected(null);
    setDirty(true);
  };

  const duplicateSection = (key: string) => {
    setSections((rows) => {
      const index = rows.findIndex((row) => row._key === key);
      if (index < 0) return rows;
      const source = rows[index]!;
      const copy: SectionRow = { ...source, _key: uid(), id: undefined, config: JSON.parse(JSON.stringify(source.config)) };
      const next = [...rows];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setDirty(true);
  };

  const move = (key: string, direction: -1 | 1) => {
    setSections((rows) => {
      const index = rows.findIndex((row) => row._key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      const a = next[index]!;
      const b = next[target]!;
      next[index] = b;
      next[target] = a;
      return next;
    });
    setDirty(true);
  };

  const persist = async (): Promise<boolean> => {
    if (!id) return false;
    setError("");
    try {
      const payloadSections = sections.map((row, index) => ({
        type: row.type,
        sortOrder: index,
        isVisible: row.isVisible,
        config: row.config ?? {},
      }));
      await adminApi(`/admin/cms/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...meta, status: page?.status, sections: payloadSections }),
      });
      setDirty(false);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const save = async () => {
    setBusy("save");
    setNotice("");
    const ok = await persist();
    setBusy("");
    if (ok) {
      setNotice("پیش‌نویس ذخیره شد.");
      await load();
    }
  };

  const publish = async () => {
    setBusy("publish");
    setNotice("");
    const saved = dirty ? await persist() : true;
    if (!saved) {
      setBusy("");
      return;
    }
    try {
      await adminApi(`/admin/cms/pages/${id}/publish`, { method: "POST", body: JSON.stringify({}) });
      setNotice("صفحه منتشر شد و در فروشگاه قابل مشاهده است.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const restore = async (version: Version) => {
    if (!id) return;
    setBusy("save");
    try {
      await adminApi(`/admin/cms/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...meta,
          status: page?.status,
          sections: version.sections.map((section, index) => ({
            type: section.type,
            sortOrder: index,
            isVisible: section.isVisible,
            config: section.config,
          })),
        }),
      });
      setNotice(`نسخه ${version.version} به‌عنوان پیش‌نویس بازیابی شد.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const selectedRow = sections.find((row) => row._key === selected) ?? null;
  const schema = selectedRow ? schemaFor(selectedRow.type) : null;

  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? 720 : 390;

  const usage = useMemo(() => new Set(sections.map((row) => row.type)), [sections]);

  if (error && !page) {
    return (
      <Card className="p-6 text-sm">
        <p className="font-semibold text-[var(--danger)]">بارگذاری صفحه ناموفق بود</p>
        <p className="mt-2 text-[var(--muted)]">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/cms/pages")}>
          بازگشت به فهرست
        </Button>
      </Card>
    );
  }

  if (!page) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/cms/pages" className="rounded-xl border border-[var(--border)] px-2.5 py-2 text-[var(--muted)] hover:bg-[var(--panel-2)]" aria-label="بازگشت">
            →
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold">{meta.title || page.title}</h1>
              <Badge variant={page.status === "PUBLISHED" ? "success" : "warn"}>{page.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}</Badge>
              {dirty ? <Badge variant="info">تغییرات ذخیره‌نشده</Badge> : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]" dir="ltr">
              /{meta.slug} · آخرین ویرایش {faDateTime(page.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setSettingsOpen((v) => !v)}>
            تنظیمات صفحه
          </Button>
          <Button variant="outline" onClick={save} disabled={busy !== "" || !dirty}>
            {busy === "save" ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}
          </Button>
          <Button onClick={publish} disabled={busy !== ""}>
            {busy === "publish" ? "در حال انتشار…" : "انتشار"}
          </Button>
          <a
            href={`${storefrontBase()}${meta.slug === "home" ? "/" : `/${meta.slug}`}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--muted)] hover:bg-[var(--panel-2)]"
          >
            مشاهده در فروشگاه ↗
          </a>
        </div>
      </Card>

      {notice ? <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-[12px] text-[var(--success)]">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-[12px] text-[var(--danger)]">{error}</div> : null}

      {settingsOpen ? (
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <Label>عنوان صفحه</Label>
            <Input value={meta.title} onChange={(e) => { setMeta({ ...meta, title: e.target.value }); setDirty(true); }} />
          </div>
          <div>
            <Label>اسلاگ (آدرس)</Label>
            <Input value={meta.slug} dir="ltr" onChange={(e) => { setMeta({ ...meta, slug: e.target.value }); setDirty(true); }} />
          </div>
          <div>
            <Label>نوع صفحه</Label>
            <Select value={meta.type} onChange={(e) => { setMeta({ ...meta, type: e.target.value }); setDirty(true); }}>
              {PAGE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>عنوان سئو</Label>
            <Input value={meta.metaTitle} onChange={(e) => { setMeta({ ...meta, metaTitle: e.target.value }); setDirty(true); }} />
          </div>
          <div className="md:col-span-2">
            <Label>توضیح سئو</Label>
            <Textarea value={meta.metaDescription} onChange={(e) => { setMeta({ ...meta, metaDescription: e.target.value }); setDirty(true); }} />
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] text-[var(--muted)]">تغییر اسلاگ، ریدایرکت خودکار ۳۰۱ از آدرس قبلی ایجاد می‌کند.</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        {/* sections list */}
        <Card className="flex max-h-[calc(100vh-220px)] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="card-title">بخش‌ها ({sections.length})</h2>
            <button type="button" onClick={() => setLibraryOpen(true)} className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-ink)]">
              + افزودن
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sections.length === 0 ? <p className="p-3 text-[11.5px] text-[var(--muted)]">هنوز بخشی اضافه نشده است.</p> : null}
            {sections.map((row, index) => (
              <div
                key={row._key}
                draggable
                onDragStart={() => setDragging(row._key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragging || dragging === row._key) return;
                  setSections((rows) => {
                    const from = rows.findIndex((r) => r._key === dragging);
                    const to = rows.findIndex((r) => r._key === row._key);
                    if (from < 0 || to < 0) return rows;
                    const next = [...rows];
                    const [moved] = next.splice(from, 1);
                    if (moved) next.splice(to, 0, moved);
                    return next;
                  });
                  setDragging(null);
                  setDirty(true);
                }}
                onClick={() => setSelected(row._key)}
                className={`mb-1.5 cursor-pointer rounded-xl border p-2.5 transition ${
                  selected === row._key ? "border-[var(--accent)] bg-[var(--accent-soft)]/60" : "border-[var(--border)] hover:bg-[var(--panel-2)]"
                } ${row.isVisible ? "" : "opacity-55"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold">{labelFor(row.type)}</span>
                  <span className="text-[10px] text-[var(--muted)]">{index + 1}</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <button type="button" title="بالا" onClick={(e) => { e.stopPropagation(); move(row._key, -1); }} className="rounded px-1 text-[10px] text-[var(--muted)] hover:bg-[var(--panel)]">▲</button>
                  <button type="button" title="پایین" onClick={(e) => { e.stopPropagation(); move(row._key, 1); }} className="rounded px-1 text-[10px] text-[var(--muted)] hover:bg-[var(--panel)]">▼</button>
                  <button type="button" title={row.isVisible ? "پنهان" : "نمایش"} onClick={(e) => { e.stopPropagation(); update(row._key, { isVisible: !row.isVisible }); }} className="rounded px-1 text-[10px] text-[var(--muted)] hover:bg-[var(--panel)]">
                    {row.isVisible ? "👁" : "🚫"}
                  </button>
                  <button type="button" title="کپی" onClick={(e) => { e.stopPropagation(); duplicateSection(row._key); }} className="rounded px-1 text-[10px] text-[var(--muted)] hover:bg-[var(--panel)]">⧉</button>
                  <button type="button" title="حذف" onClick={(e) => { e.stopPropagation(); removeSection(row._key); }} className="ms-auto rounded px-1 text-[10px] text-[var(--danger)] hover:bg-[var(--danger)]/10">✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] p-3 text-[10.5px] leading-5 text-[var(--muted)]">
            ترتیب sections را می‌توانید با کشیدن بکشید. تغییرات پس از «ذخیره پیش‌نویس» در دیتابیس ثبت می‌شود.
          </div>
        </Card>

        {/* preview */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="card-title">پیش‌نمایش زنده</h2>
            <div className="flex items-center gap-1 rounded-lg bg-[var(--panel-2)] p-0.5">
              {(["desktop", "tablet", "mobile"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setDevice(size)}
                  className={`rounded-md px-2 py-1 text-[10.5px] ${device === size ? "bg-[var(--panel)] font-semibold text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}
                >
                  {size === "desktop" ? "دسکتاپ" : size === "tablet" ? "تبلت" : "موبایل"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto bg-[var(--panel-2)] p-4">
            <div className="mx-auto overflow-hidden rounded-2xl bg-white shadow-sm transition-all" style={{ maxWidth: previewWidth }}>
              {sections.filter((row) => row.isVisible).length === 0 ? (
                <div className="p-10 text-center text-[12px] text-[#8a8175]">بخشی برای نمایش وجود ندارد.</div>
              ) : null}
              {sections.filter((row) => row.isVisible).map((row) => (
                <div key={row._key} className={`relative cursor-pointer ${selected === row._key ? "outline outline-2 -outline-offset-2 outline-[var(--accent)]" : ""}`} onClick={() => setSelected(row._key)}>
                  <PreviewBlock row={row} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* inspector */}
        <Card className="max-h-[calc(100vh-220px)] overflow-y-auto">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="card-title">تنظیمات بخش</h2>
          </div>
          {!selectedRow || !schema ? (
            <div className="p-5 text-[12px] text-[var(--muted)]">یک بخش را از فهرست انتخاب کنید.</div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-bold">{schema.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--muted)]">{schema.description}</p>
                </div>
                <Badge variant="neutral">{schema.group}</Badge>
              </div>

              {schema.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={selectedRow.config[field.key]}
                  onChange={(value) => updateConfig(selectedRow._key, field.key, value)}
                />
              ))}

              {schema.list ? (
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] font-semibold">{schema.list.label}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const items = Array.isArray(selectedRow.config[schema.list!.key]) ? [...selectedRow.config[schema.list!.key]] : [];
                        items.push({ ...schema.list!.defaults });
                        updateConfig(selectedRow._key, schema.list!.key, items);
                      }}
                      className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10.5px]"
                    >
                      + آیتم
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(Array.isArray(selectedRow.config[schema.list.key]) ? selectedRow.config[schema.list.key] : []).map((item: any, index: number) => (
                      <div key={index} className="rounded-lg bg-[var(--panel-2)] p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] text-[var(--muted)]">آیتم {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = [...selectedRow.config[schema.list!.key]];
                              items.splice(index, 1);
                              updateConfig(selectedRow._key, schema.list!.key, items);
                            }}
                            className="text-[10px] text-[var(--danger)]"
                          >
                            حذف
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {schema.list!.itemFields.map((itemField) => (
                            <input
                              key={itemField.key}
                              value={item[itemField.key] ?? ""}
                              placeholder={itemField.label}
                              onChange={(e) => {
                                const items = [...selectedRow.config[schema.list!.key]];
                                items[index] = { ...items[index], [itemField.key]: e.target.value };
                                updateConfig(selectedRow._key, schema.list!.key, items);
                              }}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-[11px] focus:border-[var(--accent)] focus:outline-none"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-xl bg-[var(--panel-2)] px-3 py-2">
                <span className="text-[11.5px]">نمایش در فروشگاه</span>
                <button
                  type="button"
                  onClick={() => update(selectedRow._key, { isVisible: !selectedRow!.isVisible })}
                  className={`relative h-5 w-9 rounded-full transition ${selectedRow!.isVisible ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                  aria-label="نمایش"
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${selectedRow!.isVisible ? "right-0.5" : "right-4"}`} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {(page.versions?.length ?? 0) > 0 ? (
        <Card className="p-4">
          <h2 className="card-title">تاریخچه نسخه‌ها</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {page.versions!.slice(0, 8).map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => restore(version)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                نسخه {version.version} {version.isPublished ? "· منتشرشده" : ""}
                <span className="ms-1 text-[10px] text-[var(--muted)]">{faDateTime(version.createdAt)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {libraryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setLibraryOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">کتابخانه بخش‌ها</h2>
              <button type="button" onClick={() => setLibraryOpen(false)} className="text-[var(--muted)]">✕</button>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">بخش مورد نظر را انتخاب کنید؛ با تنظیمات پیش‌فرض به انتهای صفحه اضافه می‌شود.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_SCHEMAS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addSection(item.type)}
                  className="rounded-xl border border-[var(--border)] p-3 text-right transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">{item.label}</span>
                    {usage.has(item.type) ? <Badge variant="info">استفاده‌شده</Badge> : null}
                  </div>
                  <p className="mt-1 text-[10.5px] leading-4 text-[var(--muted)]">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: { key: string; label: string; type: string; options?: { value: string; label: string }[]; placeholder?: string; help?: string; min?: number; max?: number }; value: any; onChange: (value: unknown) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 text-[11.5px]">
        <span>{field.label}</span>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        <Label>{field.label}</Label>
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <Label>{field.label}</Label>
        <Textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
        {field.help ? <p className="mt-1 text-[10px] text-[var(--muted)]">{field.help}</p> : null}
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div>
        <Label>{field.label}</Label>
        <Input type="number" min={field.min} max={field.max} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  if (field.type === "image") {
    return (
      <div>
        <Label>{field.label}</Label>
        <div className="flex gap-2">
          <Input value={String(value ?? "")} dir="ltr" placeholder="/media/hero/hero.jpg" onChange={(e) => onChange(e.target.value)} />
          <Button type="button" variant="outline" className="shrink-0 px-3 py-1 text-[11px]" onClick={() => setPickerOpen(true)}>
            کتابخانه
          </Button>
        </div>
        <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => onChange(url)} />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {IMAGE_SUGGESTIONS.slice(0, 5).map((image) => (
            <button key={image} type="button" onClick={() => onChange(image)} className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[9.5px] text-[var(--muted)] hover:border-[var(--accent)]">
              {image.split("/").pop()}
            </button>
          ))}
        </div>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(value)} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <Label>{field.label}</Label>
      <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} dir={field.key === "slug" || field.key === "ctaHref" ? "ltr" : undefined} />
    </div>
  );
}

function PreviewBlock({ row }: { row: SectionRow }) {
  const config = row.config ?? {};
  const image: string | undefined = config.image || config.poster;
  const items: any[] = Array.isArray(config.items) ? config.items : [];

  if (row.type === "hero") {
    if (config.variant === "full") {
      return (
        <div className="relative flex min-h-[240px] items-center bg-[#1b1712] p-8 text-white">
          {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /> : null}
          <div className="relative">
            {config.eyebrow ? <p className="text-[9px] tracking-[0.2em] text-[#e3c9a8]">{config.eyebrow}</p> : null}
            <p className="mt-2 text-xl font-bold">{config.title}</p>
            {config.subtitle ? <p className="mt-2 max-w-sm text-[10.5px] leading-5 text-white/70">{config.subtitle}</p> : null}
            {config.ctaLabel ? <span className="mt-4 inline-block rounded-full bg-[#a9713f] px-4 py-1.5 text-[10px]">{config.ctaLabel}</span> : null}
          </div>
        </div>
      );
    }
    return (
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="flex flex-col justify-center">
          {config.eyebrow ? <span className="w-fit rounded-full border border-[#e6dfd3] px-2 py-0.5 text-[8.5px] text-[#a9713f]">{config.eyebrow}</span> : null}
          <p className="mt-2 text-xl font-bold leading-7 text-[#1b1712]">{config.title}</p>
          {config.subtitle ? <p className="mt-2 text-[10px] leading-5 text-[#7a7166]">{config.subtitle}</p> : null}
          <div className="mt-3 flex gap-2">
            {config.ctaLabel ? <span className="rounded-full bg-[#1b1712] px-3 py-1.5 text-[9px] text-white">{config.ctaLabel}</span> : null}
            {config.secondaryLabel ? <span className="rounded-full border border-[#d9d2c6] px-3 py-1.5 text-[9px] text-[#4a4238]">{config.secondaryLabel}</span> : null}
          </div>
        </div>
        <div className="h-40 overflow-hidden rounded-xl bg-[#ece4d6]">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
        </div>
      </div>
    );
  }

  if (row.type === "image_text") {
    return (
      <div className={`grid gap-4 p-6 sm:grid-cols-2 ${config.align === "image-right" ? "" : ""}`}>
        <div className="h-40 overflow-hidden rounded-xl bg-[#ece4d6]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}</div>
        <div>
          {config.eyebrow ? <p className="text-[8.5px] tracking-[0.2em] text-[#a9713f]">{config.eyebrow}</p> : null}
          <p className="mt-1.5 text-base font-bold text-[#1b1712]">{config.title}</p>
          {config.body ? <p className="mt-2 text-[10px] leading-5 text-[#7a7166]">{config.body}</p> : null}
        </div>
      </div>
    );
  }

  if (row.type === "promotional_banners") {
    return (
      <div className="relative flex min-h-[160px] items-center justify-between gap-4 bg-[#1b1712] p-6 text-white">
        {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
        <div className="relative">
          <p className="text-[8.5px] tracking-[0.2em] text-[#e3c9a8]">{config.eyebrow}</p>
          <p className="mt-1.5 text-lg font-bold">{config.title}</p>
          {config.subtitle ? <p className="mt-1 text-[10px] text-white/70">{config.subtitle}</p> : null}
        </div>
        {config.ctaLabel ? <span className="relative rounded-full bg-white px-4 py-1.5 text-[10px] font-semibold text-[#1b1712]">{config.ctaLabel}</span> : null}
      </div>
    );
  }

  if (["product_grid", "best_sellers", "new_arrivals", "product_carousel"].includes(row.type)) {
    const count = Math.min(Number(config.limit ?? 4), 4);
    return (
      <div className="p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            {config.eyebrow ? <p className="text-[8.5px] tracking-[0.2em] text-[#a9713f]">{config.eyebrow}</p> : null}
            <p className="mt-1 text-base font-bold text-[#1b1712]">{config.title ?? labelFor(row.type)}</p>
          </div>
          <span className="text-[9px] text-[#a9713f]">مشاهده همه</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index}>
              <div className="aspect-[3/4] rounded-lg bg-[#efe9df]" />
              <div className="mt-1.5 h-1.5 w-3/4 rounded bg-[#efe9df]" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-[#f4efe6]" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] text-[#9a9086]">محصولات به‌صورت زنده از کاتالوگ خوانده می‌شوند (مرتب‌سازی: {config.sort ?? "پیش‌فرض"}).</p>
      </div>
    );
  }

  if (row.type === "featured_categories") {
    return (
      <div className="p-6">
        <p className="text-base font-bold text-[#1b1712]">{config.title ?? "دسته‌بندی‌ها"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: Math.min(Number(config.limit ?? 3), 3) }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg bg-[#ece4d6]" />
          ))}
        </div>
      </div>
    );
  }

  if (row.type === "testimonials" || row.type === "faq" || row.type === "image_slider") {
    return (
      <div className="p-6">
        <p className="text-base font-bold text-[#1b1712]">{config.title ?? labelFor(row.type)}</p>
        <div className="mt-3 space-y-2">
          {(items.length ? items : [{ name: "—" }, { name: "—" }]).slice(0, 2).map((item, index) => (
            <div key={index} className="rounded-lg border border-[#ece6db] p-2.5 text-[10px] text-[#4a4238]">
              {item.quote ?? item.answer ?? item.title ?? "متن نمونه"}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (row.type === "newsletter") {
    return (
      <div className="bg-[#f4efe6] p-6 text-center">
        <p className="text-base font-bold text-[#1b1712]">{config.title}</p>
        {config.subtitle ? <p className="mt-1 text-[10px] text-[#7a7166]">{config.subtitle}</p> : null}
        <div className="mx-auto mt-3 flex max-w-xs gap-1">
          <div className="h-7 flex-1 rounded-full bg-white" />
          <div className="h-7 w-16 rounded-full bg-[#a9713f]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {config.eyebrow ? <p className="text-[8.5px] tracking-[0.2em] text-[#a9713f]">{config.eyebrow}</p> : null}
      <p className="mt-1 text-base font-bold text-[#1b1712]">{config.title ?? labelFor(row.type)}</p>
      {config.body || config.text ? <p className="mt-2 text-[10px] leading-5 text-[#7a7166]">{config.body ?? config.text}</p> : null}
      {config.until ? <p className="mt-2 text-[10px] text-[#7a7166]">پایان: {new Date(config.until).toLocaleString("fa-IR")}</p> : null}
    </div>
  );
}
