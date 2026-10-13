'use client';

import { useEffect, useState } from 'react';
import { api, isoDate } from '@/lib/api';
import type { Booking, Slot } from '@/lib/types';
import { useHomeState } from '@/components/public-shell';

export default function OpenSchedulePage() {
  const { data, openRoom } = useHomeState();
  const [date, setDate] = useState(isoDate(new Date()));
  const [roomId, setRoomId] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (data?.rooms[0] && !roomId) setRoomId(data.rooms[0].id);
  }, [data, roomId]);

  useEffect(() => {
    if (!roomId) return;
    api<Slot[]>(`/api/v1/slots?roomId=${roomId}&date=${date}`).then(setSlots);
    api<Booking[]>(`/api/v1/bookings?from=${date}&to=${date}`).then(setBookings);
  }, [roomId, date]);

  if (!data) return <p>Đang tải...</p>;
  const room = data.rooms.find((r) => r.id === roomId);
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Lịch trống</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="rounded bg-black px-3 py-2" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {data.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input className="rounded bg-black px-3 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const hit = bookings.find((b) => b.room.id === roomId && b.slotIndex === slot.slotIndex);
          return (
            <button key={slot.id} disabled={Boolean(hit)} onClick={() => room && openRoom(room)} className="rounded-lg border border-stone-800 px-3 py-3 text-left disabled:text-stone-500">
              {slot.startTime} - {slot.endTime}
              <span className="mt-1 block text-xs">{hit ? 'Reserved' : 'Còn trống'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
