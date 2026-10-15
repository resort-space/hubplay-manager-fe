'use client';

import { useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api, isoDate, vnd } from '@/lib/api';

type Day = { date: string; game: number; fnb: number; cash: number; transfer: number; total: number; closed: boolean };

export default function ClosePage() {
  const scope = useAdminVenue();
  const [date, setDate] = useState(isoDate(new Date()));
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState('');
  async function load(next = date) {
    setError('');
    setDay(await api<Day>(scope.path(`/api/v1/revenue/day?date=${next}`)));
  }
  return (
    <div className="mx-auto max-w-lg">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={(id) => { scope.choose(id); setDay(null); }} />
      <div className="admin-card">
      <h1 className="admin-title mb-4">Doanh thu theo ngày</h1>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="date" className="admin-input" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button variant="ghost" onClick={() => load()}>Xem</Button>
      </div>
      {day && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Phòng chơi" value={`${vnd(day.game)} đ`} />
          <Stat label="Đồ uống" value={`${vnd(day.fnb)} đ`} />
          <Stat label="Tiền mặt" value={`${vnd(day.cash)} đ`} />
          <Stat label="Chuyển khoản" value={`${vnd(day.transfer)} đ`} />
          <div className="col-span-2 rounded-xl bg-slate-50 p-3">
            <p className="admin-muted">Tổng {day.closed ? '· đã chốt' : ''}</p>
            <p className="admin-title admin-money">{vnd(day.total)} đ</p>
          </div>
          {!day.closed && <Button className="col-span-2" onClick={async () => { try { setDay(await api('/api/v1/revenue/close', { method: 'POST', body: JSON.stringify(scope.body({ date })) })); } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi'); } }}>Chốt ca</Button>}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="admin-muted">{label}</p>
      <p className="admin-label admin-money">{value}</p>
    </div>
  );
}
