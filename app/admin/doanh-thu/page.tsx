'use client';

import { useState } from 'react';
import { api, vnd } from '@/lib/api';

type Summary = { year: number; period: string; closedDays: number; escape: number; board: number; sat: number; fnb: number; game: number };

export default function RevenuePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('year');
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-4 shadow">
      <h1 className="mb-3 text-xl font-bold">Thống kê doanh thu</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="w-24 rounded border px-2 py-1" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        <select className="rounded border px-2 py-1" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="year">Cả năm</option>
          <option value="Q1">Quý 1</option>
          <option value="Q2">Quý 2</option>
          <option value="Q3">Quý 3</option>
          <option value="Q4">Quý 4</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <button className="rounded bg-blue-600 px-3 text-white" onClick={async () => { setError(''); try { setData(await api(`/api/v1/revenue/summary?year=${year}&period=${period}`)); } catch (e) { setError(e instanceof Error ? e.message : 'Không xem được'); } }}>Xem</button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <div className="space-y-1 text-sm">
          <p>Ngày đã chốt trong kỳ: {data.closedDays}</p>
          <p>Escape: {vnd(data.escape)} đ</p>
          <p>Board: {vnd(data.board)} đ</p>
          <p>SAT: {vnd(data.sat)} đ</p>
          <p>Đồ uống: {vnd(data.fnb)} đ</p>
        </div>
      )}
    </div>
  );
}
