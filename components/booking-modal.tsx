'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, isoDate, addDays } from '@/lib/api';
import type { Room, Slot } from '@/lib/types';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BookingModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [date, setDate] = useState(isoDate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [playerCount, setPlayerCount] = useState(2);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i - ((anchor.getDay() + 6) % 7))), [anchor]);

  useEffect(() => {
    api<Slot[]>(`/api/v1/slots?roomId=${room.id}&date=${date}`).then(setSlots).catch((e) => setError(e.message));
  }, [room.id, date]);

  function toggle(slot: Slot) {
    if (slot.reserved) return;
    setPicked((cur) => {
      if (cur.includes(slot.slotIndex)) return cur.filter((n) => n !== slot.slotIndex);
      const next = [...cur, slot.slotIndex].sort((a, b) => a - b);
      if (next.length > 2) return [slot.slotIndex];
      if (next.length === 2 && next[1] - next[0] !== 1) return [slot.slotIndex];
      return next;
    });
  }

  async function submit() {
    setError('');
    try {
      await api('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({ roomId: room.id, date, slotIndexes: picked, guestName, email, phone, playerCount, note }),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không giữ được chỗ');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-[#121a17] p-6 text-stone-100" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          <button onClick={onClose} className="text-stone-400">×</button>
        </div>
        {done ? (
          <p>Chờ quán xác nhận. Nhân viên Door Escape Room sẽ gọi số {phone}.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-stone-400">Chọn ngày</p>
            <div className="mb-3 flex gap-2 overflow-auto">
              {week.map((d) => {
                const key = isoDate(d);
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                const on = key === date;
                return (
                  <button key={key} onClick={() => { setDate(key); setPicked([]); }} className={`min-w-16 rounded-lg border px-2 py-2 text-center ${on ? 'slot-on border-[#e8c56b]' : 'border-stone-700'} ${weekend ? 'text-rose-300' : ''}`}>
                    <div className="text-xs">{days[(d.getDay() + 6) % 7]}</div>
                    <div className="text-lg">{d.getDate()}</div>
                  </button>
                );
              })}
              <label className="min-w-20 rounded-lg border border-stone-700 px-2 py-2 text-center text-xs">
                Ngày khác
                <input className="mt-1 w-full bg-transparent text-xs" type="date" value={date} onChange={(e) => { setDate(e.target.value); setAnchor(new Date(e.target.value)); setPicked([]); }} />
              </label>
            </div>
            <p className="mb-3 text-sm text-rose-400">*Chỉ đặt tối đa 2 ca liên tiếp. Quầy sẽ gọi xác nhận, chưa thu tiền trên web.</p>
            <p className="mb-2 text-sm text-stone-400">Chọn giờ</p>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button key={slot.id} disabled={slot.reserved} onClick={() => toggle(slot)} className={`rounded-lg border px-2 py-3 text-sm ${picked.includes(slot.slotIndex) ? 'slot-on border-[#e8c56b]' : 'border-stone-700'} ${slot.reserved ? 'text-stone-500' : ''}`}>
                  {slot.startTime} - {slot.endTime}
                  {slot.reserved ? ' (Reserved)' : ''}
                </button>
              ))}
            </div>
            <p className="mb-2 text-sm text-stone-400">Thông tin đặt phòng</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Họ và tên*
                <input className="mt-1 w-full rounded bg-black px-2 py-2" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </label>
              <label className="text-sm">Email*
                <input className="mt-1 w-full rounded bg-black px-2 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="text-sm">Số điện thoại*
                <input className="mt-1 w-full rounded bg-black px-2 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <label className="mt-3 block text-sm">Số người (tối đa {room.capacity})
              <input className="mt-1 w-24 rounded bg-black px-2 py-2" type="number" min={1} max={room.capacity} value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))} />
            </label>
            <label className="mt-3 block text-sm">Ghi chú
              <input className="mt-1 w-full rounded bg-black px-2 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded bg-stone-600 px-4 py-2" onClick={onClose}>Hủy</button>
              <button className="btn-gold rounded px-4 py-2 font-semibold" disabled={!picked.length || !guestName || !email || !phone} onClick={submit}>Giữ chỗ ngay</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
