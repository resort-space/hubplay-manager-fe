'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { HomeData } from '@/lib/types';

export default function RoomsPage() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [price, setPrice] = useState(350000);
  async function load() { setHome(await api<HomeData>('/api/v1/home')); }
  useEffect(() => { load(); }, []);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form className="rounded-xl bg-white p-4 shadow" onSubmit={async (e) => {
        e.preventDefault();
        const room = await api<{ id: string }>('/api/v1/rooms', { method: 'POST', body: JSON.stringify({ name, code, capacity }) });
        await api('/api/v1/sub-games', { method: 'POST', body: JSON.stringify({ name, code, basePrice: price, kind: 'escape', roomId: room.id, tags: 'kinh dị' }) });
        setName(''); setCode('');
        load();
      }}>
        <h1 className="mb-3 text-xl font-bold">Thêm phòng escape</h1>
        <input className="mb-2 w-full rounded border px-2 py-1" placeholder="Tên" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mb-2 w-full rounded border px-2 py-1" placeholder="Mã R3" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className="mb-2 w-full rounded border px-2 py-1" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        <input className="mb-2 w-full rounded border px-2 py-1" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <button className="rounded bg-blue-600 px-3 py-2 text-white">Lưu</button>
      </form>
      <div className="rounded-xl bg-white p-4 shadow">
        {home?.subGames.map((g) => <p key={g.id} className="border-b py-2">{g.category.name} · {g.name} · {g.basePrice}</p>)}
      </div>
    </div>
  );
}
