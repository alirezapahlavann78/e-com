"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";

interface Segment {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count?: { members?: number };
}

interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED";
  channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
  startsAt: string | null;
  endsAt: string | null;
  segment: { id: string; name: string } | null;
  _count?: { recipients?: number };
}

interface GiftCard {
  id: string;
  code: string;
  initialValue: string | number;
  balance: string | number;
  currency: string;
  isActive: boolean;
  expiresAt: string | null;
}

interface AbandonedCart {
  id: string;
  email: string | null;
  itemCount: number;
  subtotal: string | number;
  status: string;
  lastEventAt: string;
  cart?: {
    items?: {
      product: { name: string; slug: string };
    }[];
  } | null;
}

const faNum = (n: number) => n.toLocaleString("fa-IR");
const faMoney = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("fa-IR")} تومان`;
const faDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fa-IR");
  } catch {
    return d;
  }
};

const emptyCampaign = {
  name: "",
  slug: "",
  description: "",
  status: "DRAFT",
  channel: "EMAIL",
  segmentId: "",
  startsAt: "",
  endsAt: "",
};

const emptyGiftCard = {
  code: "",
  initialValue: "",
  expiresAt: "",
  isActive: "true",
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [campaignModal, setCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState(emptyCampaign);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [giftModal, setGiftModal] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftCard | null>(null);
  const [giftForm, setGiftForm] = useState(emptyGiftCard);
  const [giftSaving, setGiftSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, s, g, a] = await Promise.all([
        adminApi<Campaign[]>("/marketing/campaigns"),
        adminApi<Segment[]>("/crm/segments"),
        adminApi<GiftCard[]>("/marketing/gift-cards"),
        adminApi<AbandonedCart[]>("/marketing/abandoned-carts"),
      ]);
      setCampaigns(c);
      setSegments(s);
      setGiftCards(g);
      setAbandonedCarts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت داده‌های بازاریابی");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCampaignForm = (c?: Campaign) => {
    setEditingCampaign(c ?? null);
    setFormError("");
    setCampaignForm(
      c
        ? {
            name: c.name,
            slug: c.slug,
            description: c.description ?? "",
            status: c.status,
            channel: c.channel,
            segmentId: c.segment?.id ?? "",
            startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
            endsAt: c.endsAt ? c.endsAt.slice(0, 10) : "",
          }
        : emptyCampaign
    );
    setCampaignModal(true);
  };

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        name: campaignForm.name,
        slug: campaignForm.slug,
        description: campaignForm.description || undefined,
        status: campaignForm.status,
        channel: campaignForm.channel,
        segmentId: campaignForm.segmentId || undefined,
      };
      if (campaignForm.startsAt) body.startsAt = new Date(campaignForm.startsAt).toISOString();
      if (campaignForm.endsAt) body.endsAt = new Date(campaignForm.endsAt).toISOString();
      if (editingCampaign) {
        await adminApi(`/marketing/campaigns/${editingCampaign.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminApi("/marketing/campaigns", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setCampaignModal(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطا در ذخیره کمپین");
    } finally {
      setCampaignSaving(false);
    }
  };

  const openGiftForm = (g?: GiftCard) => {
    setEditingGift(g ?? null);
    setFormError("");
    setGiftForm(
      g
        ? {
            code: g.code,
            initialValue: String(g.initialValue),
            expiresAt: g.expiresAt ? g.expiresAt.slice(0, 10) : "",
            isActive: String(g.isActive),
          }
        : emptyGiftCard
    );
    setGiftModal(true);
  };

  const submitGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftSaving(true);
    setFormError("");
    try {
      if (editingGift) {
        await adminApi(`/marketing/gift-cards/${editingGift.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            isActive: giftForm.isActive === "true",
            balance: Number(giftForm.initialValue),
          }),
        });
      } else {
        await adminApi("/marketing/gift-cards", {
          method: "POST",
          body: JSON.stringify({
            code: giftForm.code,
            initialValue: Number(giftForm.initialValue),
            isActive: giftForm.isActive === "true",
            ...(giftForm.expiresAt ? { expiresAt: new Date(giftForm.expiresAt).toISOString() } : {}),
          }),
        });
      }
      setGiftModal(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطا در ذخیره کارت هدیه");
    } finally {
      setGiftSaving(false);
    }
  };

  const segmentForm = { name: "", slug: "", description: "" };
  const [newSegment, setNewSegment] = useState(segmentForm);
  const [segmentSaving, setSegmentSaving] = useState(false);

  const createSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSegmentSaving(true);
    try {
      await adminApi("/crm/segments", {
        method: "POST",
        body: JSON.stringify(newSegment),
      });
      setNewSegment(segmentForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در ایجاد سگمنت");
    } finally {
      setSegmentSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">بازاریابی و کمپینها</h1>
          <p className="text-sm opacity-60">
            {faNum(campaigns.length)} کمپین · {faNum(giftCards.length)} کارت هدیه ·{" "}
            {faNum(abandonedCarts.length)} سبد رهاشده
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openGiftForm()}>
            + کارت هدیه
          </Button>
          <Button onClick={() => openCampaignForm()}>+ کمپین جدید</Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}

      {/* سگمنت ها و کمپین ها کنار هم */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="سگمنتهای مشتریان" subtitle="دستهبندی مخاطبان هدف" />
          <form onSubmit={createSegment} className="space-y-2 border-b border-[var(--border)] p-3">
            <Input
              required
              placeholder="نام سگمنت"
              value={newSegment.name}
              onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
            />
            <Input
              required
              dir="ltr"
              placeholder="slug (مثال: vip)"
              value={newSegment.slug}
              onChange={(e) => setNewSegment({ ...newSegment, slug: e.target.value })}
            />
            <Button type="submit" className="w-full text-xs" disabled={segmentSaving}>
              {segmentSaving ? "در حال ایجاد…" : "افزودن سگمنت"}
            </Button>
          </form>
          <div className="max-h-80 space-y-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex justify-center p-6"><Spinner /></div>
            ) : segments.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--muted)]">سگمنتی وجود ندارد.</p>
            ) : (
              segments.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-[10px] text-[var(--muted)]" dir="ltr">{s.slug}</p>
                  </div>
                  <Badge variant={s.isActive ? "success" : "neutral"}>
                    {faNum(s._count?.members ?? 0)} عضو
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="کمپینها" subtitle="کمپینهای ایمیل، پیامک و درونبرنامهای" />
          {loading ? (
            <div className="flex justify-center p-12"><Spinner className="h-8 w-8" /></div>
          ) : campaigns.length === 0 ? (
            <EmptyState title="کمپینی وجود ندارد" description="اولین کمپین خود را ایجاد کنید." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>کمپین</TH>
                  <TH>کانال</TH>
                  <TH>سگمنت</TH>
                  <TH>وضعیت</TH>
                  <TH>زمانبندی</TH>
                  <TH>ویرایش</TH>
                </TR>
              </THead>
              <TBody>
                {campaigns.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[10px] text-[var(--muted)]" dir="ltr">{c.slug}</div>
                    </TD>
                    <TD className="text-xs">{c.channel}</TD>
                    <TD className="text-xs">{c.segment?.name ?? "همه"}</TD>
                    <TD>
                      <Badge variant={c.status === "ACTIVE" ? "success" : c.status === "PAUSED" ? "warn" : "neutral"}>
                        {c.status}
                      </Badge>
                    </TD>
                    <TD className="text-xs opacity-70">
                      {faDate(c.startsAt)} — {faDate(c.endsAt)}
                    </TD>
                    <TD>
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => openCampaignForm(c)}
                      >
                        ویرایش
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {/* کارتهای هدیه و سبدهای رهاشده */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="کارتهای هدیه" subtitle="اعتبار و وضعیت کارتهای صادرشده" />
          {loading ? (
            <div className="flex justify-center p-10"><Spinner /></div>
          ) : giftCards.length === 0 ? (
            <EmptyState title="کارت هدیهای وجود ندارد" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>کد</TH>
                  <TH>اعتبار اولیه</TH>
                  <TH>موجودی</TH>
                  <TH>وضعیت</TH>
                  <TH>انقضا</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {giftCards.map((g) => (
                  <TR key={g.id}>
                    <TD className="font-mono text-xs font-medium" dir="ltr">{g.code}</TD>
                    <TD className="text-xs">{faMoney(Number(g.initialValue))}</TD>
                    <TD className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {faMoney(Number(g.balance))}
                    </TD>
                    <TD>
                      <Badge variant={g.isActive ? "success" : "danger"}>
                        {g.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TD>
                    <TD className="text-xs opacity-70">{faDate(g.expiresAt)}</TD>
                    <TD>
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => openGiftForm(g)}
                      >
                        ویرایش
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="سبدهای خرید رهاشده" subtitle="فرصتهای بازگشت مشتری" />
          {loading ? (
            <div className="flex justify-center p-10"><Spinner /></div>
          ) : abandonedCarts.length === 0 ? (
            <EmptyState title="سبد رهاشدهای ثبت نشده است" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>ایمیل مشتری</TH>
                  <TH>تعداد اقلام</TH>
                  <TH>مجموع</TH>
                  <TH>وضعیت</TH>
                  <TH>آخرین رویداد</TH>
                </TR>
              </THead>
              <TBody>
                {abandonedCarts.map((a) => (
                  <TR key={a.id}>
                    <TD className="text-xs" dir="ltr">{a.email ?? "مشتری مهمان"}</TD>
                    <TD className="text-xs">{faNum(a.itemCount)}</TD>
                    <TD className="text-xs font-medium">{faMoney(Number(a.subtotal))}</TD>
                    <TD><Badge variant="warn">{a.status}</Badge></TD>
                    <TD className="text-xs opacity-70">{faDate(a.lastEventAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {/* مودال کمپین */}
      <Modal
        open={campaignModal}
        onClose={() => setCampaignModal(false)}
        title={editingCampaign ? `ویرایش کمپین: ${editingCampaign.name}` : "کمپین جدید"}
      >
        <form onSubmit={submitCampaign} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>نام کمپین *</Label><Input required value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} /></div>
            <div><Label>اسلاگ *</Label><Input required dir="ltr" value={campaignForm.slug} onChange={(e) => setCampaignForm({ ...campaignForm, slug: e.target.value })} /></div>
            <div>
              <Label>وضعیت</Label>
              <Select value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}>
                <option value="DRAFT">پیشنویس</option>
                <option value="SCHEDULED">زمانبندیشده</option>
                <option value="ACTIVE">فعال</option>
                <option value="PAUSED">مکث</option>
                <option value="COMPLETED">اتمامیافته</option>
              </Select>
            </div>
            <div>
              <Label>کانال</Label>
              <Select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                <option value="EMAIL">ایمیل</option>
                <option value="SMS">پیامک</option>
                <option value="PUSH">نوتیفیکیشن</option>
                <option value="IN_APP">درونبرنامه</option>
              </Select>
            </div>
            <div>
              <Label>سگمنت هدف</Label>
              <Select value={campaignForm.segmentId} onChange={(e) => setCampaignForm({ ...campaignForm, segmentId: e.target.value })}>
                <option value="">همه مشتریان</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div><Label>تاریخ شروع</Label><Input type="date" dir="ltr" value={campaignForm.startsAt} onChange={(e) => setCampaignForm({ ...campaignForm, startsAt: e.target.value })} /></div>
            <div><Label>تاریخ پایان</Label><Input type="date" dir="ltr" value={campaignForm.endsAt} onChange={(e) => setCampaignForm({ ...campaignForm, endsAt: e.target.value })} /></div>
          </div>
          <div><Label>توضیحات</Label><Input value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} /></div>
          {formError ? <p className="text-xs text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCampaignModal(false)}>انصراف</Button>
            <Button type="submit" disabled={campaignSaving}>{campaignSaving ? "در حال ذخیره…" : "ذخیره کمپین"}</Button>
          </div>
        </form>
      </Modal>

      {/* مودال کارت هدیه */}
      <Modal
        open={giftModal}
        onClose={() => setGiftModal(false)}
        title={editingGift ? "ویرایش کارت هدیه" : "کارت هدیه جدید"}
      >
        <form onSubmit={submitGift} className="space-y-4 text-sm">
          <div><Label>کد کارت *</Label><Input required dir="ltr" placeholder="GIFT-1000" value={giftForm.code} onChange={(e) => setGiftForm({ ...giftForm, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>مبلغ اعتبار (تومان) *</Label><Input required type="number" min="0" dir="ltr" value={giftForm.initialValue} onChange={(e) => setGiftForm({ ...giftForm, initialValue: e.target.value })} /></div>
          <div><Label>تاریخ انقضا</Label><Input type="date" dir="ltr" value={giftForm.expiresAt} onChange={(e) => setGiftForm({ ...giftForm, expiresAt: e.target.value })} /></div>
          <div>
            <Label>وضعیت</Label>
            <Select value={giftForm.isActive} onChange={(e) => setGiftForm({ ...giftForm, isActive: e.target.value })}>
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </Select>
          </div>
          {formError ? <p className="text-xs text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setGiftModal(false)}>انصراف</Button>
            <Button type="submit" disabled={giftSaving}>{giftSaving ? "در حال ذخیره…" : "ذخیره کارت هدیه"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
