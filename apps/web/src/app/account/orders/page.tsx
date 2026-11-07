'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setErr('برای مشاهده سفارش‌ها وارد شوید.'); return; }
    fetch(`${API}/my/orders`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) ? setOrders(d) : setErr(d?.message || 'خطا')).catch(e => setErr(String(e)));
  }, []);
  return <main style={{maxWidth:900,margin:'2rem auto',padding:'0 1rem'}}><h1>سفارش‌های من</h1>{err && <p>{err}</p>}<ul style={{listStyle:'none',padding:0}}>{orders.map(o => <li key={o.id} style={{border:'1px solid #ddd',padding:'1rem',margin:'1rem 0',borderRadius:8}}><Link href={`/account/orders/${o.id}`}><b>{o.number}</b></Link> — {o.status} / {o.paymentStatus} — {o.total} {o.currency}<div>{o.items?.length ?? 0} کالا</div></li>)}</ul></main>;
}
