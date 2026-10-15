'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { AdminSelect } from '@/components/ui/admin-select';
import { Button } from '@/components/ui/button';
import { addDays, api, isoDate, startOfWeek, vnd } from '@/lib/api';
import type { Booking, HomeData, Me, Slot } from '@/lib/types';

type Line = { description: string; qty: number; unitPrice: number; ledger: 'game' | 'fnb'; kind: 'subgame' | 'fnb_item' | 'extra_manual' | 'discount'; categoryKind?: string; code?: string };
type PlaySession = { date: string; slotIndex: number; playerCount: number; sessionCode: string | null; room: { name: string } };

export default function QuayPage() {
  const scope = useAdminVenue();
  const seenVenue = useRef('');
  const [cursor, setCursor] = useState(() => new Date());
  const [home, setHome] = useState<HomeData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomId, setRoomId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [phone, setPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [receiptBookingId, setReceiptBookingId] = useState('');
  const [detail, setDetail] = useState<Booking | null>(null);
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [drinkId, setDrinkId] = useState('');
  const [drinkQty, setDrinkQty] = useState(1);
  const [extraName, setExtraName] = useState('');
  const [extraPrice, setExtraPrice] = useState(0);
  const [extraQty, setExtraQty] = useState(1);
  const [photoPhone, setPhotoPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cashier, setCashier] = useState('');
  const weekStart = startOfWeek(cursor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [picked, setPicked] = useState(() => isoDate(new Date()));
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  async function load() {
    const data = await api<HomeData>(scope.path('/api/v1/home'));
    setHome(data);
    setRoomId((cur) => (data.rooms.some((room) => room.id === cur) ? cur : data.rooms[0]?.id || ''));
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    setBookings(await api<Booking[]>(scope.path(`/api/v1/bookings?from=${from}&to=${to}`)));
  }

  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    const stamp = scope.isSystem ? scope.venueId : 'staff';
    if (seenVenue.current && seenVenue.current !== stamp) {
      setLines([]);
      setReceiptBookingId('');
    }
    seenVenue.current = stamp;
    load().catch(() => undefined);
  }, [cursor, scope.ready, scope.venueId, scope.isSystem]);
  useEffect(() => {
    api<{ user: Me }>('/api/v1/auth/me').then((r) => setCashier(r.user?.username || '')).catch(() => undefined);
  }, []);

  const slots: Slot[] = home?.slots || [];
  const sessionPreview = playLines(bookings.find((item) => item.id === receiptBookingId));
  const discountCode = lines.find((line) => line.kind === 'discount')?.code || '';

  function bumpLine(match: (line: Line) => boolean, create: Line) {
    setLines((cur) => {
      const index = cur.findIndex(match);
      if (index < 0) return [...cur, create];
      const next = [...cur];
      next[index] = { ...next[index], qty: next[index].qty + create.qty };
      return next;
    });
  }

  function roomLine(forRoomId: string): Line | null {
    const game = home?.subGames.find((g) => g.roomId === forRoomId) || home?.subGames[0];
    if (!game) return null;
    return { description: game.name, qty: 1, unitPrice: game.basePrice, ledger: 'game', kind: 'subgame', categoryKind: game.category.kind };
  }

  function addGame() {
    const line = roomLine(roomId);
    if (!line) return;
    setLines((cur) => [...cur, line]);
  }

  function payBooking(booking: Booking) {
    setPhone(booking.phone);
    setGuestName(booking.guestName);
    setRoomId(booking.room.id);
    const line = roomLine(booking.room.id);
    if (receiptBookingId === booking.id) {
      setLines((cur) => {
        if (!line) return cur;
        const exists = cur.some((row) => row.kind === 'subgame' && row.description === line.description && row.unitPrice === line.unitPrice);
        return exists ? cur : [...cur, line];
      });
    } else {
      setLines(line ? [line] : []);
    }
    setReceiptBookingId(booking.id);
  }

  function customerLabel() {
    const name = guestName.trim();
    const tel = phone.trim();
    if (name && tel) return `${name} · ${tel}`;
    return name || tel;
  }

  function removeLine(index: number) {
    setLines((cur) => cur.filter((_, i) => i !== index));
  }

  function applyDiscount(code: string) {
    setLines((cur) => {
      const rest = cur.filter((line) => line.kind !== 'discount');
      if (!code) return rest;
      const discount = home?.discounts.find((item) => item.code === code);
      if (!discount) return rest;
      return [...rest, { description: `Khuyến mãi ${discount.code}`, qty: 1, unitPrice: -discount.amount, ledger: 'game', kind: 'discount', code: discount.code }];
    });
  }

  function playLines(play: PlaySession | null | undefined) {
    if (!play) return [];
    const slot = (home?.slots || []).find((item) => item.slotIndex === play.slotIndex);
    const [year, month, day] = play.date.split('-');
    const dateLabel = day && month && year ? `${day}/${month}/${year}` : play.date;
    const when = slot ? `${dateLabel} · ${slot.startTime}–${slot.endTime}` : dateLabel;
    const rows = [when, `${play.room.name} · Ca ${play.slotIndex} · ${play.playerCount} người`];
    if (play.sessionCode) rows.unshift(`Mã ca: ${play.sessionCode}`);
    return rows;
  }

  async function printReceipt() {
    const receipt = await api<{ bills: { lines: { description: string; qty: number; unitPrice: number }[] }[]; booking: PlaySession | null; venue: { name: string; address: string } }>('/api/v1/receipts', {
      method: 'POST',
      body: JSON.stringify(scope.body({ phone, guestName, bookingId: receiptBookingId || undefined, paymentMethod: method, lines })),
    });
    const box = document.getElementById('bill-print');
    if (box) {
      const rows = receipt.bills.flatMap((b) => b.lines);
      const total = rows.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      const head = [customerLabel() ? `Khách: ${customerLabel()}` : '', ...playLines(receipt.booking)].filter(Boolean).join('\n');
      const customer = head ? `${head}\n--------------------------------\n` : '';
      const cashierLine = cashier ? `\nThu ngân: ${cashier}` : '';
      box.innerHTML = `<pre>${receipt.venue.name}\n${receipt.venue.address}\n--------------------------------\n${customer}${rows.map((l) => `${l.description} x${l.qty}`.padEnd(24, ' ') + vnd(l.qty * l.unitPrice)).join('\n')}\n--------------------------------\nTỔNG ${vnd(total)}\nThanh toán: ${method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}${cashierLine}</pre>`;
    }
    window.print();
    setLines([]);
    setGuestName('');
    setReceiptBookingId('');
  }

  function bookingCard(b: Booking) {
    const held = b.status === 'confirmed';
    const selected = receiptBookingId === b.id;
    return (
      <article key={b.id} className={`mb-1 rounded-lg p-2 text-white ${held ? 'bg-emerald-600' : 'bg-amber-500'} ${selected ? 'ring-2 ring-white' : ''}`}>
        <p className="text-sm font-medium">{b.room.name}</p>
        <p className="text-sm">{b.phone}</p>
        <p className="text-xs text-white/85">{held ? 'Đã giữ' : 'Chờ gọi'}</p>
        <span className="mt-2 flex flex-col gap-1">
          <span className="flex gap-1">
            <button className="min-h-9 flex-1 rounded-lg bg-white/25 px-2 text-xs font-semibold" onClick={() => payBooking(b)}>Thanh toán</button>
            <button className="min-h-9 flex-1 rounded-lg bg-white/25 px-2 text-xs font-semibold" onClick={() => setDetail(b)}>Chi tiết</button>
          </span>
          {b.status === 'pending_confirm' && (
            <span className="flex gap-1">
              <button className="min-h-9 flex-1 rounded-lg bg-white/25 px-2 text-sm font-semibold" onClick={async () => { await api(`/api/v1/bookings/${b.id}/confirm`, { method: 'POST' }); load(); }}>Giữ</button>
              <button className="min-h-9 flex-1 rounded-lg bg-white/25 px-2 text-sm font-semibold" onClick={async () => { await api(`/api/v1/bookings/${b.id}/cancel`, { method: 'POST' }); load(); }}>Hủy</button>
            </span>
          )}
        </span>
      </article>
    );
  }

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3rem)] lg:overflow-hidden">
    <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
      <section className="admin-card overflow-hidden lg:min-h-0 lg:overflow-y-auto">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setCursor(addDays(cursor, -7))}>Tuần trước</Button>
          <p className="admin-label">{isoDate(days[0])} – {isoDate(days[6])}</p>
          <Button variant="ghost" onClick={() => setCursor(addDays(cursor, 7))}>Tuần sau</Button>
        </div>
        <div className="mb-4 flex gap-2 overflow-auto lg:hidden">
          {days.map((d, i) => {
            const key = isoDate(d);
            const on = key === picked;
            return (
              <button key={key} onClick={() => setPicked(key)} className={`min-w-14 rounded-xl border px-2 py-2 text-center ${on ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200'}`}>
                <div className={`text-xs ${on ? 'text-white/80' : 'text-slate-500'}`}>{dayLabels[i]}</div>
                <div className="text-lg font-semibold">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <div className="space-y-2 lg:hidden">
          {slots.map((slot) => {
            const cell = bookings.filter((b) => b.date === picked && b.slotIndex === slot.slotIndex);
            return (
              <div key={slot.id} className="rounded-xl border border-slate-100 p-2">
                <p className="admin-muted mb-1">{slot.startTime} – {slot.endTime}</p>
                {cell.map(bookingCard)}
                {!cell.length && <p className="admin-muted">Trống</p>}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-auto lg:block">
          <div className="grid min-w-[880px]" style={{ gridTemplateColumns: '112px repeat(7, minmax(110px, 1fr))' }}>
            <div className="sticky left-0 bg-white" />
            {days.map((d, i) => (
              <div key={isoDate(d)} className="border-b border-slate-100 px-2 py-2 text-center">
                <p className="admin-muted">{dayLabels[i]}</p>
                <p className="admin-label">{d.getDate()}</p>
              </div>
            ))}
            {slots.map((slot) => (
              <Fragment key={slot.id}>
                <div className="sticky left-0 border-b border-slate-100 bg-white py-2 admin-muted">{slot.startTime} – {slot.endTime}</div>
                {days.map((d) => {
                  const key = isoDate(d);
                  const cell = bookings.filter((b) => b.date === key && b.slotIndex === slot.slotIndex);
                  return (
                    <div key={slot.id + key} className="min-h-16 border-b border-l border-slate-100 p-1">
                      {cell.map(bookingCard)}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <aside className="space-y-4 lg:min-h-0 lg:overflow-y-auto">
        <div className="admin-card space-y-4">
          <h2 className="admin-label">Phiếu thu</h2>
          <div className="space-y-2">
            <p className="admin-muted">Thiết lập thông tin đơn</p>
            <input className="admin-input" placeholder="Tên khách" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <input className="admin-input" placeholder="SĐT khách" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <AdminSelect label="Phòng" value={roomId} onChange={setRoomId} options={(home?.rooms || []).map((room) => ({ value: room.id, label: room.name }))} />
            <Button variant="ghost" onClick={addGame}>Thêm phòng</Button>
            <AdminSelect searchable label="Đồ uống" value={drinkId} onChange={setDrinkId} options={[{ value: '', label: 'Đồ uống' }, ...(home?.drinks || []).map((drink) => ({ value: drink.id, label: drink.name, hint: `${vnd(drink.price)} đ` }))]} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input className="admin-input" type="number" min={1} aria-label="Số lượng đồ uống" placeholder="Số lượng" value={drinkQty} onChange={(e) => setDrinkQty(Math.max(1, Number(e.target.value) || 1))} />
              <Button variant="ghost" disabled={!drinkId} onClick={() => {
                const drink = home?.drinks.find((d) => d.id === drinkId);
                if (!drink) return;
                bumpLine(
                  (line) => line.kind === 'fnb_item' && line.description === drink.name && line.unitPrice === drink.price,
                  { description: drink.name, qty: drinkQty, unitPrice: drink.price, ledger: 'fnb', kind: 'fnb_item' },
                );
                setDrinkId('');
                setDrinkQty(1);
              }}>Thêm</Button>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <p className="admin-label">Extra</p>
              <input className="admin-input" placeholder="Tên mặt hàng" value={extraName} onChange={(e) => setExtraName(e.target.value)} />
              <input className="admin-input" type="number" min={0} placeholder="Giá" value={extraPrice || ''} onChange={(e) => setExtraPrice(Number(e.target.value))} />
              <label className="block space-y-1">
                <span className="admin-muted">Số lượng</span>
                <input className="admin-input" type="number" min={1} aria-label="Số lượng extra" value={extraQty} onChange={(e) => setExtraQty(Math.max(1, Number(e.target.value) || 1))} />
              </label>
              <p className="admin-muted admin-money">Thành tiền {vnd(extraQty * extraPrice)} đ</p>
              <Button variant="ghost" disabled={!extraName.trim()} onClick={() => {
                const name = extraName.trim();
                bumpLine(
                  (line) => line.kind === 'extra_manual' && line.description === name && line.unitPrice === extraPrice,
                  { description: name, qty: extraQty, unitPrice: extraPrice, ledger: 'game', kind: 'extra_manual' },
                );
                setExtraName('');
                setExtraQty(1);
              }}>Thêm extra</Button>
            </div>
            <AdminSelect label="Mã giảm giá" value={discountCode} onChange={applyDiscount} options={[{ value: '', label: 'Không giảm' }, ...(home?.discounts || []).map((discount) => ({ value: discount.code, label: discount.code, hint: `-${vnd(discount.amount)}` }))]} />
            <AdminSelect label="Hình thức thanh toán" value={method} onChange={(next) => setMethod(next as 'cash' | 'transfer')} options={[{ value: 'cash', label: 'Tiền mặt' }, { value: 'transfer', label: 'Chuyển khoản' }]} />
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="admin-muted">Danh sách thanh toán</p>
            {lines.map((line, i) => (
              <div key={`${line.kind}-${line.description}-${line.unitPrice}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">{line.description} x{line.qty}</span>
                <span className="admin-money">{vnd(line.qty * line.unitPrice)}</span>
                <Button variant="ghost" onClick={() => removeLine(i)}>Xóa</Button>
              </div>
            ))}
            {!lines.length && <p className="admin-muted">Chưa có dòng.</p>}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="admin-muted">Hóa đơn</p>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800">
            <p className="text-center text-sm font-semibold">{home?.venue.name || 'Phiếu thu'}</p>
            <p className="text-center text-slate-500">{home?.venue.address}</p>
            <p className="my-2 border-t border-dashed border-slate-300" />
            {customerLabel() && <p>Khách: {customerLabel()}</p>}
            {sessionPreview.map((row) => <p key={row}>{row}</p>)}
            {(customerLabel() || sessionPreview.length > 0) && <p className="my-2 border-t border-dashed border-slate-300" />}
            {lines.map((line) => (
              <div key={`${line.kind}-${line.description}-${line.unitPrice}`} className="mb-1 flex justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{line.description} x{line.qty}</span>
                <span>{vnd(line.qty * line.unitPrice)}</span>
              </div>
            ))}
            {!lines.length && <p className="text-center text-slate-400">Chưa có dòng</p>}
            <p className="my-2 border-t border-dashed border-slate-300" />
            <p className="flex justify-between font-semibold"><span>TỔNG</span><span>{vnd(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}</span></p>
            <p>Thanh toán: {method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}</p>
            {cashier && <p>Thu ngân: {cashier}</p>}
          </div>
          </div>
          <Button className="w-full" disabled={!phone || !lines.length} onClick={printReceipt}>Lưu và in</Button>
        </div>
        <form className="admin-card space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          const body = new FormData();
          body.set('phone', photoPhone);
          body.set('file', file);
          if (scope.isSystem && scope.venueId) body.set('venueId', scope.venueId);
          await api('/api/v1/photos', { method: 'POST', body });
          setPhotoPhone('');
          setFile(null);
        }}>
          <h2 className="admin-label">Ảnh ca cho khách</h2>
          <input className="admin-input" placeholder="SĐT" value={photoPhone} onChange={(e) => setPhotoPhone(e.target.value)} />
          <input className="admin-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button type="submit">Tải lên</Button>
        </form>
      </aside>
      <div id="bill-print" />
    </div>
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDetail(null)}>
          <div role="dialog" aria-modal="true" aria-label="Chi tiết ca chơi" className="admin-card w-full max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-label">Chi tiết ca</h2>
            <p className="text-sm">{detail.room.name}</p>
            <p className="text-sm">{detail.date} · {slots.find((slot) => slot.slotIndex === detail.slotIndex)?.startTime} – {slots.find((slot) => slot.slotIndex === detail.slotIndex)?.endTime}</p>
            <p className="text-sm">{detail.guestName}</p>
            <p className="text-sm">{detail.phone}</p>
            {detail.email && <p className="text-sm">{detail.email}</p>}
            <p className="text-sm">{detail.playerCount} người</p>
            <p className="text-sm">{detail.status === 'confirmed' ? 'Đã giữ' : 'Chờ gọi'}</p>
            {detail.sessionCode && <p className="text-sm">Mã ca {detail.sessionCode}</p>}
            <Button variant="ghost" onClick={() => setDetail(null)}>Đóng</Button>
          </div>
        </div>
      )}
    </div>
  );
}
