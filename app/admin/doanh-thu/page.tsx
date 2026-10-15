'use client';

import { useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { AdminSelect } from '@/components/ui/admin-select';
import { Button } from '@/components/ui/button';
import { api, vnd } from '@/lib/api';

type Summary = { year: number; period: string; closedDays: number; fnb: number; game: number; categories: { id: string; name: string; total: number }[] };

export default function RevenuePage() {
  const scope = useAdminVenue();
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('year');
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  return (
    <div className="mx-auto max-w-lg">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={(id) => { scope.choose(id); setData(null); }} />
      <div className="admin-card">
      <h1 className="admin-title mb-4">Thống kê doanh thu</h1>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="admin-input sm:w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        <AdminSelect label="Kỳ thống kê" value={period} onChange={setPeriod} options={[{ value: 'year', label: 'Cả năm' }, { value: 'Q1', label: 'Quý 1' }, { value: 'Q2', label: 'Quý 2' }, { value: 'Q3', label: 'Quý 3' }, { value: 'Q4', label: 'Quý 4' }, ...Array.from({ length: 12 }, (_, i) => { const month = String(i + 1).padStart(2, '0'); return { value: month, label: `Tháng ${month}` }; })]} />
        <Button onClick={async () => { setError(''); try { setData(await api(scope.path(`/api/v1/revenue/summary?year=${year}&period=${period}`))); } catch (e) { setError(e instanceof Error ? e.message : 'Không xem được'); } }}>Xem</Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Ngày đã chốt" value={String(data.closedDays)} />
          {data.categories.map((category) => <Stat key={category.id} label={category.name} value={`${vnd(category.total)} đ`} />)}
          <Stat label="Đồ uống" value={`${vnd(data.fnb)} đ`} />
          <Stat label="Tổng game" value={`${vnd(data.game)} đ`} />
        </div>
      )}
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
