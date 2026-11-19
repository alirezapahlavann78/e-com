"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { Badge, Button, Card, Input, Label, Modal, Select, Spinner } from "../../components/ui";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  parent?: { id: string; name: string } | null;
}

const emptyForm = {
  name: "", slug: "", description: "", imageUrl: "", bannerUrl: "",
  parentId: "", sortOrder: "0", isActive: "true", seoTitle: "", seoDescription: "",
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await adminApi<Category[]>("/admin/categories"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت دسته‌بندی‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tree = useMemo(() => {
    const byId = new Map<string, TreeNode>(items.map((c) => [c.id, { ...c, children: [] }]));
    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  }, [items]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.imageUrl ?? "",
      bannerUrl: "", parentId: c.parentId ?? "", sortOrder: String(c.sortOrder),
      isActive: String(c.isActive), seoTitle: c.seoTitle ?? "", seoDescription: c.seoDescription ?? "",
    });
    setFormError("");
    setEditOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setCreateOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = { name: form.name, slug: form.slug };
      if (form.description) body.description = form.description;
      if (form.imageUrl) body.imageUrl = form.imageUrl;
      if (form.bannerUrl) body.bannerUrl = form.bannerUrl;
      if (form.parentId) body.parentId = form.parentId;
      body.sortOrder = Number(form.sortOrder) || 0;
      body.isActive = form.isActive === "true";
      if (form.seoTitle) body.seoTitle = form.seoTitle;
      if (form.seoDescription) body.seoDescription = form.seoDescription;
      if (editing) await adminApi(`/admin/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await adminApi("/admin/categories", { method: "POST", body: JSON.stringify(body) });
      setEditOpen(false);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "خطا در ذخیره دسته‌بندی");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = items.filter((c) => !editing || c.id !== editing.id);

  const renderForm = () => (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label>نام *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>اسلاگ *</Label><Input required dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
        <div>
          <Label>دسته والد</Label>
          <Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            <option value="">— بدون والد —</option>
            {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div><Label>ترتیب</Label><Input type="number" dir="ltr" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
        <div><Label>آدرس تصویر</Label><Input dir="ltr" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
        <div><Label>آدرس بنر</Label><Input dir="ltr" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} /></div>
        <div>
          <Label>وضعیت</Label>
          <Select value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value })}>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </Select>
        </div>
        <div><Label>عنوان سئو</Label><Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></div>
      </div>
      <div><Label>توضیحات</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div><Label>توضیحات سئو</Label><Input value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></div>
      {formError && <p className="text-xs text-red-500">{formError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={() => (editing ? setEditOpen(false) : setCreateOpen(false))}>انصراف</Button>
        <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">دسته‌بندی‌ها</h1>
          <p className="text-sm opacity-60">{new Intl.NumberFormat("fa-IR").format(items.length)} دسته‌بندی</p>
        </div>
        <Button onClick={openCreate}>+ دسته جدید</Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm opacity-60">دسته‌بندی‌ای وجود ندارد.</div>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <TreeNodeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} onEdit={openEdit} />
            ))}
          </div>
        )}
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`ویرایش: ${editing?.name ?? ""}`}>
        {renderForm()}
      </Modal>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="دسته جدید">
        {renderForm()}
      </Modal>
    </div>
  );
}

interface TreeNode extends Category { children: TreeNode[] }

function TreeNodeRow({ node, depth, expanded, onToggle, onEdit }: {
  node: TreeNode; depth: number; expanded: Set<string>; onToggle: (id: string) => void; onEdit: (c: Category) => void;
}) {
  const isOpen = expanded.has(node.id);
  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
        style={{ marginInlineStart: depth * 24 }}
      >
        {node.children.length > 0 ? (
          <button onClick={() => onToggle(node.id)} className="flex h-6 w-6 items-center justify-center rounded border text-xs" aria-label={isOpen ? "بستن" : "باز کردن"}>
            {isOpen ? "−" : "+"}
          </button>
        ) : (
          <span className="h-6 w-6" />
        )}
        {node.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.imageUrl} alt={node.name} className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-black/5 text-[10px] opacity-50 dark:bg-white/10">📁</div>
        )}
        <span className="font-medium">{node.name}</span>
        <span className="text-xs opacity-50" dir="ltr">{node.slug}</span>
        <Badge variant={node.isActive ? "success" : "danger"}>{node.isActive ? "فعال" : "غیرفعال"}</Badge>
        {node.parent && <span className="hidden text-xs opacity-50 sm:inline">والد: {node.parent.name}</span>}
        <Button variant="outline" className="ms-auto px-3 py-1 text-xs" onClick={() => onEdit(node)}>ویرایش</Button>
      </div>
      {isOpen && node.children.map((child) => (
        <TreeNodeRow key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} />
      ))}
    </div>
  );
}
