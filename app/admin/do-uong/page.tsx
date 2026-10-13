'use client';

import { useEffect, useState } from 'react';
import { api, vnd } from '@/lib/api';
import type { Drink, HomeData } from '@/lib/types';

export default function DrinksPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(20000);
  async function load() {
    const home = await api<HomeData>('/api/v1/home');
    setDrinks(home.drinks);
  }
  useEffect(() => { load(); }, []);
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-4 shadow">
      <h1 className="mb-3 text-xl font-bold">Danh sách đồ uống</h1>
      <form className="mb-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/drinks', { method: 'POST', body: JSON.stringify({ name, price }) }); setName(''); load(); }}>
        <input className="flex-1 rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên" />
        <input className="w-28 rounded border px-2 py-1" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <button className="rounded bg-blue-600 px-3 text-white">Thêm</button>
      </form>
      {drinks.map((d) => <p key={d.id} className="border-b py-2">{d.name} · {vnd(d.price)} đ</p>)}
    </div>
  );
}
