'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useHomeState } from '@/components/public-shell';

export default function ContactPage() {
  const { data } = useHomeState();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');
  const [sent, setSent] = useState(false);
  if (!data) return <p>Đang tải...</p>;
  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-3xl font-bold">Liên hệ</h1>
      <p className="mb-1">{data.venue.name}</p>
      <p className="mb-6 text-stone-400">{data.venue.address}</p>
      {sent ? <p>Đã gửi lời nhắn.</p> : (
        <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/contact', { method: 'POST', body: JSON.stringify({ name, phone, content }) }); setSent(true); }}>
          <input required placeholder="Họ và tên" className="rounded bg-black px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          <input required placeholder="Số điện thoại" className="rounded bg-black px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <textarea required placeholder="Lời nhắn" className="rounded bg-black px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-gold w-fit rounded px-4 py-2">Gửi</button>
        </form>
      )}
    </div>
  );
}
