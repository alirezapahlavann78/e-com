"use client";

import { useCallback, useEffect, useState } from "react";

import { adminApi, faDate, faDateTime } from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState, Input, Label, Modal, Pagination, Select, Spinner, Table, TBody, TD, TH, THead, TR } from "../../components/ui";

type Role = { id: string; name: string; description: string | null; isSystem?: boolean };
type UserRole = { role: Role };
type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isAdmin: boolean;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  emailVerified: string | null;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  createdAt: string;
  roles: UserRole[];
};

const STATUS_LABEL: Record<string, string> = { ACTIVE: "فعال", INACTIVE: "غیرفعال", SUSPENDED: "مسدود" };
const STATUS_VARIANT: Record<string, "success" | "neutral" | "danger"> = { ACTIVE: "success", INACTIVE: "neutral", SUSPENDED: "danger" };

const fullName = (user: AdminUser) => [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", password: "", isAdmin: false });
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, roleList] = await Promise.all([
        adminApi<{ items: AdminUser[]; total: number }>(`/admin/users?page=${page}&limit=${limit}`),
        adminApi<Role[]>("/admin/rbac/roles"),
      ]);
      setUsers(list.items);
      setTotal(list.total);
      setRoles(roleList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت کاربران");
      setUsers([]);
    }
  }, [page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>, successMessage: string) {
    setBusyId(id);
    setError("");
    try {
      await adminApi(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setNotice(successMessage);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره ناموفق بود");
    } finally {
      setBusyId("");
    }
  }

  async function createUser() {
    setError("");
    try {
      await adminApi("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          isAdmin: form.isAdmin,
        }),
      });
      setCreating(false);
      setForm({ email: "", firstName: "", lastName: "", password: "", isAdmin: false });
      setNotice("کاربر ساخته شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ساخت کاربر ناموفق بود");
    }
  }

  function openEditor(user: AdminUser) {
    setEditing(user);
    setEditStatus(user.status);
    setEditRoleIds(user.roles.map((item) => item.role.id));
  }

  async function saveEditor() {
    if (!editing) return;
    await patch(editing.id, { status: editStatus, roleIds: editRoleIds, isAdmin: editing.isAdmin }, "تغییرات کاربر ذخیره شد.");
    setEditing(null);
  }

  const filtered = (users ?? []).filter((user) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return [user.email, user.firstName, user.lastName, user.phone].some((value) => value?.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">کاربران و نقش‌ها</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">دسترسی کارکنان و مشتریان را همین‌جا مدیریت کنید؛ هر تغییر در لاگ ممیزی ثبت می‌شود.</p>
        </div>
        <Button onClick={() => setCreating(true)}>کاربر جدید</Button>
      </div>

      {error ? <p className="rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12px] text-[var(--danger)]">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-[var(--accent)]/10 px-3 py-2 text-[12px]">{notice}</p> : null}

      <Card>
        <CardHeader
          title="فهرست کاربران"
          subtitle={`${total} کاربر`}
          action={
            <div className="w-64">
              <Input placeholder="جستجو در ایمیل و نام…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          }
        />
        {users === null ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-7 w-7" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="کاربری یافت نشد" description="عبارت جستجو را تغییر دهید یا کاربر تازه بسازید." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>نام</TH>
                <TH>ایمیل</TH>
                <TH>نقش‌ها</TH>
                <TH>وضعیت</TH>
                <TH>آخرین ورود</TH>
                <TH>عضویت</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((user) => {
                const locked = user.lockoutUntil && new Date(user.lockoutUntil) > new Date();
                return (
                  <TR key={user.id}>
                    <TD>
                      <p className="font-medium">{fullName(user)}</p>
                      {user.isAdmin ? <Badge variant="info" className="mt-1">مدیر</Badge> : null}
                    </TD>
                    <TD dir="ltr" className="text-xs">{user.email}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length ? user.roles.map((item) => <Badge key={item.role.id}>{item.role.name}</Badge>) : <span className="text-[11px] text-[var(--muted)]">بدون نقش</span>}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={STATUS_VARIANT[user.status] ?? "neutral"}>{STATUS_LABEL[user.status] ?? user.status}</Badge>
                        {locked ? <Badge variant="danger">قفل ورود</Badge> : null}
                      </div>
                    </TD>
                    <TD className="text-[11px] text-[var(--muted)]">{user.lastLoginAt ? faDateTime(user.lastLoginAt) : "—"}</TD>
                    <TD className="text-[11px] text-[var(--muted)]">{faDate(user.createdAt)}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => openEditor(user)}>
                          نقش/وضعیت
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-[11px]"
                          disabled={busyId === user.id}
                          onClick={() => void patch(user.id, { status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }, user.status === "ACTIVE" ? "کاربر مسدود شد." : "کاربر فعال شد.")}
                        >
                          {user.status === "ACTIVE" ? "مسدودسازی" : "فعال‌سازی"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
        {total > limit ? (
          <div className="border-t p-3">
            <Pagination page={page} limit={limit} total={total} onPage={setPage} />
          </div>
        ) : null}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="کاربر جدید" footer={<Button onClick={() => void createUser()}>ساخت کاربر</Button>}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-email">ایمیل</Label>
            <Input id="new-email" dir="ltr" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="new-first">نام</Label>
              <Input id="new-first" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="new-last">نام خانوادگی</Label>
              <Input id="new-last" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="new-password">رمز عبور</Label>
            <Input id="new-password" dir="ltr" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <p className="mt-1 text-[11px] text-[var(--muted)]">حداقل ۸ کاراکتر؛ کاربر می‌تواند بعداً از پنل مشتری تغییرش دهد.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAdmin} onChange={(event) => setForm({ ...form, isAdmin: event.target.checked })} />
            دسترسی به پنل مدیریت
          </label>
        </div>
      </Modal>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`مدیریت ${editing?.email ?? ""}`} footer={<Button onClick={() => void saveEditor()}>ذخیره</Button>}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-status">وضعیت حساب</Label>
            <Select id="edit-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
              <option value="ACTIVE">فعال</option>
              <option value="INACTIVE">غیرفعال</option>
              <option value="SUSPENDED">مسدود</option>
            </Select>
          </div>
          <div>
            <Label>نقش‌ها</Label>
            <div className="mt-2 space-y-2 rounded-xl border border-[var(--border)] p-3">
              {roles.length === 0 ? <p className="text-[12px] text-[var(--muted)]">نقشی تعریف نشده است.</p> : null}
              {roles.map((role) => (
                <label key={role.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editRoleIds.includes(role.id)}
                    onChange={(event) =>
                      setEditRoleIds((ids) => (event.target.checked ? [...ids, role.id] : ids.filter((id) => id !== role.id)))
                    }
                  />
                  <span>
                    <span className="font-medium">{role.name}</span>
                    {role.description ? <span className="block text-[11px] text-[var(--muted)]">{role.description}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {editing?.lockoutUntil ? (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-[11px] text-[var(--danger)]">
              این حساب تا {faDateTime(editing.lockoutUntil)} قفل است. برای باز کردن فوری، در ترمینال پروژه دستور <span dir="ltr">pnpm user:unlock</span> را اجرا کنید.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
