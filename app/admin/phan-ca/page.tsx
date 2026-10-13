'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { HomeData, Slot } from '@/lib/types';

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => { api<HomeData>('/api/v1/home').then((d) => setSlots(d.slots)); }, []);
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white p-4 shadow">
      <h1 className="mb-4 text-xl font-bold">Phân 13 ca</h1>
      {slots.map((slot) => (
        <form key={slot.id} className="mb-2 flex items-center gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          await api(`/api/v1/slots/${slot.id}`, { method: 'PATCH', body: JSON.stringify({ startTime: form.get('start'), endTime: form.get('end'), enabled: true }) });
        }}>
          <span className="w-8">{slot.slotIndex}</span>
          <input name="start" defaultValue={slot.startTime} className="rounded border px-2 py-1" />
          <input name="end" defaultValue={slot.endTime} className="rounded border px-2 py-1" />
          <button className="rounded bg-blue-600 px-3 py-1 text-white">Lưu</button>
        </form>
      ))}
    </div>
  );
}
