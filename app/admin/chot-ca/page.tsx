'use client';

import { useState } from 'react';
import { api, isoDate, vnd } from '@/lib/api';

type Day = { date: string; game: number; fnb: number; cash: number; transfer: number; total: number; closed: boolean };

export default function ClosePage() {
  const [date, setDate] = useState(isoDate(new Date()));
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState('');
  async function load(next = date) {
    setError('');
    setDay(await api<Day>(`/api/v1/revenue/day?date=${next}`));
  }
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-4 shadow">
      <h1 className="mb-3 text-xl font-bold">Doanh thu theo ngày</h1>
      <div className="mb-3 flex gap-2">
        <input type="date" className="rounded border px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="rounded border px-3" onClick={() => load()}>Xem</button>
      </div>
      {day && (
        <div className="space-y-1 text-sm">
          <p>Phòng chơi: {vnd(day.game)} đ</p>
          <p>Đồ uống: {vnd(day.fnb)} đ</p>
          <p>Tiền mặt: {vnd(day.cash)} đ · Chuyển khoản: {vnd(day.transfer)} đ</p>
          <p className="font-semibold">Tổng {vnd(day.total)} đ {day.closed ? '(đã chốt)' : ''}</p>
          {!day.closed && <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white" onClick={async () => { try { setDay(await api('/api/v1/revenue/close', { method: 'POST', body: JSON.stringify({ date }) })); } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi'); } }}>Chốt ca</button>}
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
