'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { HomeData } from '@/lib/types';

export default function CmsPage() {
  const [guide, setGuide] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [reviews, setReviews] = useState('');
  useEffect(() => {
    api<HomeData>('/api/v1/home').then((d) => {
      setGuide(d.cms?.guide || '');
      setPriceNote(d.cms?.priceNote || '');
      setReviews(d.cms?.reviews || '');
    });
  }, []);
  return (
    <form className="mx-auto grid max-w-2xl gap-3 rounded-xl bg-white p-4 shadow" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/cms', { method: 'POST', body: JSON.stringify({ guide, priceNote, reviews }) }); }}>
      <h1 className="text-xl font-bold">Nội dung trang khách</h1>
      <textarea className="min-h-40 rounded border p-2" value={guide} onChange={(e) => setGuide(e.target.value)} />
      <input className="rounded border px-2 py-1" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
      <textarea className="min-h-32 rounded border p-2" value={reviews} onChange={(e) => setReviews(e.target.value)} placeholder="Tên|Nội dung" />
      <button className="w-fit rounded bg-blue-600 px-4 py-2 text-white">Lưu</button>
    </form>
  );
}
