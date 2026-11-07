'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function MyOrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !params?.id) return;
    fetch(`${API}/my/orders/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => d?.id ? setOrder(d) : setErr(d?.message || 'خطا')).catch(e => setErr(String(e)));
  }, [params?.id]);
  if (err) return <main style={{padding:'2rem'}}>{err}</main>;
  if (!order) return <main style={{padding:'2rem'}}>در حال بارگذاری...</main>;
  return <main style={{maxWidth:900,margin:'2rem auto',padding:'0 1rem'}}><h1>سفارش {order.number}</h1><p>وضعیت: {order.status} — پرداخت: {order.paymentStatus} — مبلغ: {order.total} {order.currency}</p><h2>کالاها</h2><ul>{order.items?.map((i:any)=><li key={i.id}>{i.name} × {i.quantity} = {i.totalPrice}</li>)}</ul><h2>ارسال</h2><ul>{order.shipments?.map((s:any)=><li key={s.id}>{s.status} {s.carrier} {s.trackingNumber}</li>) || <li>هنوز ثبت نشده</li>}</ul><h2>تاریخچه وضعیت</h2><ul>{order.statusHistory?.map((h:any)=><li key={h.id}>{h.toStatus} — {h.note} — {new Date(h.createdAt).toLocaleString('fa-IR')}</li>)}</ul></main>;
}
