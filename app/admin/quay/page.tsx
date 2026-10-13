'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { addDays, api, isoDate, startOfWeek, vnd } from '@/lib/api';
import type { Booking, Drink, HomeData, Slot } from '@/lib/types';

type Line = { description: string; qty: number; unitPrice: number; ledger: 'game' | 'fnb'; kind: 'subgame' | 'fnb_item' | 'extra_manual' | 'discount'; categoryKind?: string };

export default function QuayPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [home, setHome] = useState<HomeData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomId, setRoomId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [extraName, setExtraName] = useState('Extra');
  const [extraPrice, setExtraPrice] = useState(30000);
  const [photoPhone, setPhotoPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const weekStart = startOfWeek(cursor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  async function load() {
    const data = await api<HomeData>('/api/v1/home');
    setHome(data);
    if (!roomId && data.rooms[0]) setRoomId(data.rooms[0].id);
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    setBookings(await api<Booking[]>(`/api/v1/bookings?from=${from}&to=${to}`));
  }

  useEffect(() => { load().catch(() => undefined); }, [cursor]);

  const slots: Slot[] = home?.slots || [];
  const pending = bookings.filter((b) => b.status === 'pending_confirm');

  function addGame() {
    const game = home?.subGames.find((g) => g.roomId === roomId) || home?.subGames[0];
    if (!game) return;
    setLines((cur) => [...cur, { description: game.name, qty: 1, unitPrice: game.basePrice, ledger: 'game', kind: 'subgame', categoryKind: game.category.kind }]);
  }

  async function printReceipt() {
    const receipt = await api<{ id: string; bills: { lines: { description: string; qty: number; unitPrice: number }[] }[]; payments: { method: string; amount: number }[]; venue: { name: string; address: string } }>('/api/v1/receipts', {
      method: 'POST',
      body: JSON.stringify({ phone, paymentMethod: method, lines }),
    });
    const box = document.getElementById('bill-print');
    if (box) {
      const rows = receipt.bills.flatMap((b) => b.lines);
      const total = rows.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      box.innerHTML = `<pre>${receipt.venue.name}\n${receipt.venue.address}\n--------------------------------\n${rows.map((l) => `${l.description} x${l.qty}`.padEnd(24, ' ') + vnd(l.qty * l.unitPrice)).join('\n')}\n--------------------------------\nTỔNG ${vnd(total)}\nThanh toán: ${method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}\nCK: quét QR tại quầy</pre>`;
    }
    window.print();
    setLines([]);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <section className="overflow-auto rounded-xl bg-white p-3 shadow">
        <div className="mb-3 flex items-center gap-2">
          <button className="rounded border px-2 py-1" onClick={() => setCursor(addDays(cursor, -7))}>Tuần trước</button>
          <strong>{isoDate(days[0])} - {isoDate(days[6])}</strong>
          <button className="rounded border px-2 py-1" onClick={() => setCursor(addDays(cursor, 7))}>Tuần sau</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: `120px repeat(7, minmax(120px, 1fr))` }}>
          <div />
          {days.map((d) => <div key={isoDate(d)} className="border-b px-2 py-1 text-center text-sm font-medium">{isoDate(d)}</div>)}
          {slots.map((slot) => (
            <Fragment key={slot.id}>
              <div className="border-b py-2 text-xs text-slate-500">{slot.startTime} - {slot.endTime}</div>
              {days.map((d) => {
                const key = isoDate(d);
                const cell = bookings.filter((b) => b.date === key && b.slotIndex === slot.slotIndex);
                return (
                  <div key={slot.id + key} className="min-h-16 border-b border-l p-1">
                    {cell.map((b) => (
                      <article key={b.id} className={`mb-1 rounded p-1 text-xs text-white ${b.status === 'confirmed' ? 'bg-emerald-600' : 'bg-orange-500'}`}>
                        <p>{b.room.name}</p>
                        <p>{b.phone}</p>
                        <p>{b.status === 'confirmed' ? 'Đã giữ' : 'Chờ gọi'}</p>
                        {b.status === 'pending_confirm' && (
                          <span className="mt-1 flex gap-1">
                            <button className="rounded bg-white/20 px-1" onClick={async () => { await api(`/api/v1/bookings/${b.id}/confirm`, { method: 'POST' }); load(); }}>Giữ</button>
                            <button className="rounded bg-white/20 px-1" onClick={async () => { await api(`/api/v1/bookings/${b.id}/cancel`, { method: 'POST' }); load(); }}>Hủy</button>
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-xl bg-white p-3 shadow">
          <h2 className="mb-2 font-semibold">Chờ gọi</h2>
          {pending.map((b) => (
            <p key={b.id} className="border-b py-2 text-sm">{b.date} ca {b.slotIndex}<br />{b.guestName} · {b.phone}<br />{b.room.name}</p>
          ))}
          {!pending.length && <p className="text-sm text-slate-500">Không có ca chờ.</p>}
        </div>
        <div className="rounded-xl bg-white p-3 shadow">
          <h2 className="mb-2 font-semibold">Phiếu thu</h2>
          <input className="mb-2 w-full rounded border px-2 py-1" placeholder="SĐT khách" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="mb-2 w-full rounded border px-2 py-1" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {home?.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="mb-2 rounded bg-slate-800 px-2 py-1 text-sm text-white" onClick={addGame}>Thêm phòng</button>
          <div className="mb-2 flex gap-1">
            <select className="flex-1 rounded border px-1" onChange={(e) => {
              const drink = home?.drinks.find((d) => d.id === e.target.value);
              if (!drink) return;
              setLines((cur) => [...cur, { description: drink.name, qty: 1, unitPrice: drink.price, ledger: 'fnb', kind: 'fnb_item' }]);
            }}>
              <option value="">Đồ uống</option>
              {home?.drinks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="mb-2 flex gap-1">
            <input className="w-24 rounded border px-1" value={extraName} onChange={(e) => setExtraName(e.target.value)} />
            <input className="w-20 rounded border px-1" type="number" value={extraPrice} onChange={(e) => setExtraPrice(Number(e.target.value))} />
            <button className="rounded border px-2" onClick={() => setLines((cur) => [...cur, { description: extraName, qty: 1, unitPrice: extraPrice, ledger: 'game', kind: 'extra_manual' }])}>Extra</button>
          </div>
          {lines.map((line, i) => <p key={i} className="text-sm">{line.description} · {vnd(line.unitPrice)}</p>)}
          <p className="my-2 font-semibold">Tổng {vnd(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))} đ</p>
          <select className="mb-2 w-full rounded border px-2 py-1" value={method} onChange={(e) => setMethod(e.target.value as 'cash' | 'transfer')}>
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản</option>
          </select>
          <button className="w-full rounded bg-blue-600 px-3 py-2 text-white" disabled={!phone || !lines.length} onClick={printReceipt}>Lưu và in</button>
        </div>
        <form className="rounded-xl bg-white p-3 shadow" onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          const body = new FormData();
          body.set('phone', photoPhone);
          body.set('file', file);
          await api('/api/v1/photos', { method: 'POST', body });
          setPhotoPhone('');
          setFile(null);
        }}>
          <h2 className="mb-2 font-semibold">Ảnh ca cho khách</h2>
          <input className="mb-2 w-full rounded border px-2 py-1" placeholder="SĐT" value={photoPhone} onChange={(e) => setPhotoPhone(e.target.value)} />
          <input className="mb-2 w-full text-sm" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="rounded bg-slate-800 px-3 py-1 text-white">Tải lên</button>
        </form>
      </aside>
      <div id="bill-print" />
    </div>
  );
}
