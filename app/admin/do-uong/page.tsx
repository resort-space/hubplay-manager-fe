'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api, priceFromInput, vnd } from '@/lib/api';
import type { Drink, HomeData } from '@/lib/types';

export default function DrinksPage() {
  const scope = useAdminVenue();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(20);
  async function load() {
    const home = await api<HomeData>(scope.path('/api/v1/home'));
    setDrinks(home.drinks);
  }
  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    load();
  }, [scope.ready, scope.venueId, scope.isSystem]);
  return (
    <div className="mx-auto max-w-lg">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
      <div className="admin-card">
      <h1 className="admin-title mb-4">Danh sách đồ uống</h1>
      <form className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/drinks', { method: 'POST', body: JSON.stringify(scope.body({ name, price: priceFromInput(price) })) }); setName(''); load(); }}>
        <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên" />
        <input className="admin-input" type="number" min={0} aria-label="Giá nghìn đồng" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <Button type="submit">Thêm</Button>
      </form>
      {drinks.map((d) => <p key={d.id} className="border-b border-slate-100 py-3 text-sm">{d.name} · <span className="admin-money">{vnd(d.price)} đ</span></p>)}
      </div>
    </div>
  );
}
