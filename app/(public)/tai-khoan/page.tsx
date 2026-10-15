'use client';

import { useEffect, useState } from 'react';
import { api, vnd } from '@/lib/api';
import type { Me } from '@/lib/types';

type Account = {
  bookings: { id: string; date: string; slotIndex: number; status: string; room: { name: string }; venue: { name: string } }[];
  receipts: { id: string; createdAt: string; bills: { type: string; total: number; lines: { description: string; qty: number; unitPrice: number }[] }[]; payments: { method: string; amount: number }[]; venue: { name: string } }[];
  photos: { id: string; fileRef: string; caption: string }[];
};

export default function AccountPage() {
  const [me, setMe] = useState<Me>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [tab, setTab] = useState<'choi' | 'bill' | 'anh'>('choi');
  const [data, setData] = useState<Account | null>(null);
  const [hint, setHint] = useState('');

  async function load() {
    const session = await api<{ user: Me }>('/api/v1/auth/me');
    setMe(session.user);
    if (session.user?.kind === 'user') setData(await api<Account>('/api/v1/me'));
  }

  useEffect(() => { load().catch(() => setMe(null)); }, []);

  if (me?.kind !== 'user') {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-stone-800 bg-[#121a17] p-6">
        <h1 className="mb-4 text-2xl font-bold">Đăng nhập</h1>
        {step === 'phone' ? (
          <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); const res = await api<{ devCode?: string }>('/api/v1/auth/otp', { method: 'POST', body: JSON.stringify({ phone }) }); setHint(res.devCode ? `Mã dev: ${res.devCode}` : 'Đã gửi OTP'); setStep('otp'); }}>
            <input className="rounded bg-black px-3 py-2" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn-gold rounded px-4 py-2">Nhận OTP</button>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }); await load(); }}>
            <p className="text-sm text-stone-400">{hint}</p>
            <input className="rounded bg-black px-3 py-2" placeholder="Mã OTP" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-gold rounded px-4 py-2">Vào tài khoản</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Tài khoản {me.phone}</h1>
      <div className="mb-4 flex gap-2">
        {(['choi', 'bill', 'anh'] as const).map((key) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded px-3 py-2 ${tab === key ? 'btn-gold' : 'bg-stone-800'}`}>
            {key === 'choi' ? 'Lịch sử chơi' : key === 'bill' ? 'Lịch sử bill' : 'Ảnh đã chơi'}
          </button>
        ))}
      </div>
      {tab === 'choi' && data?.bookings.map((b) => (
        <p key={b.id} className="border-b border-stone-800 py-2">{b.date} · ca {b.slotIndex} · {b.room.name} · {b.status} · {b.venue.name}</p>
      ))}
      {tab === 'bill' && data?.receipts.map((r) => (
        <div key={r.id} className="border-b border-stone-800 py-3 text-sm">
          {r.bills.flatMap((b) => b.lines).map((line) => (
            <p key={line.description + line.unitPrice}>{line.description} x{line.qty} · {vnd(line.qty * line.unitPrice)} đ</p>
          ))}
          <p className="text-stone-400">{r.venue.name} · {r.payments.map((p) => `${p.method} ${vnd(p.amount)}`).join(', ')}</p>
        </div>
      ))}
      {tab === 'anh' && (
        <div className="grid grid-cols-2 gap-3">
          {data?.photos.map((p) => (
            <figure key={p.id}>
              <img src={`/api/v1/files/${p.fileRef}`} alt={p.caption || 'Ảnh ca'} className="rounded" />
              <figcaption className="text-sm text-stone-400">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
