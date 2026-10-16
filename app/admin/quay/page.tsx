'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Info, Trash2 } from 'lucide-react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { AdminSelect } from '@/components/ui/admin-select';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { addDays, api, isoDate, priceFromInput, startOfWeek, vnd } from '@/lib/api';
import { printReceiptQuiet, QzRefused } from '@/lib/receipt-print';
import type { Booking, HomeData, Me, Slot } from '@/lib/types';

type Line = { description: string; qty: number; unitPrice: number; ledger: 'game' | 'fnb'; kind: 'subgame' | 'fnb_item' | 'extra_manual' | 'discount'; categoryKind?: string; categoryId?: string; subGameId?: string; playerCount?: number; code?: string };
type PlaySession = { date: string; slotIndex: number; playerCount: number; sessionCode: string | null; room: { name: string } };
type PrintSlip = {
  venueName: string;
  address: string;
  head: string[];
  rows: { description: string; qty: number; unitPrice: number }[];
  total: number;
  pay: string;
  cashPaid: number | null;
  cashier: string;
};
const slipWidth = 32;

function moneyLine(label: string, amount: string) {
  if (label.length + 1 + amount.length > slipWidth) return `${label}\n${amount.padStart(slipWidth, ' ')}`;
  return label.padEnd(slipWidth - amount.length, ' ') + amount;
}

function formatRow(line: { description: string; qty: number; unitPrice: number }) {
  const amount = vnd(line.qty * line.unitPrice);
  const players = line.description.match(/^(.*) · (\d+ người)$/);
  if (players) return `${players[1]}\n${moneyLine(`${players[2]} x${line.qty}`, amount)}`;
  return moneyLine(`${line.description} x${line.qty}`, amount);
}

function formatSlip(slip: PrintSlip) {
  const head = slip.head.length ? `${slip.head.join('\n')}\n--------------------------------\n` : '';
  const cashierLine = slip.cashier ? `\nThu ngân: ${slip.cashier}` : '';
  const rows = slip.rows.map(formatRow).join('\n');
  const payLabel = `Thanh toán: ${slip.pay}`;
  const pay = slip.cashPaid == null ? payLabel : moneyLine(payLabel, vnd(slip.cashPaid));
  const short = slip.cashPaid != null && slip.cashPaid > 0 && slip.cashPaid < slip.total;
  const change = slip.cashPaid == null ? '' : `\n${moneyLine(short ? 'Còn thiếu' : 'Trả lại', vnd(short ? slip.total - slip.cashPaid : Math.max(0, slip.cashPaid - slip.total)))}`;
  return `--------------------------------\n${head}${rows}\n--------------------------------\nTỔNG ${vnd(slip.total)}\n${pay}${change}${cashierLine}`;
}

export default function QuayPage() {
  const scope = useAdminVenue();
  const seenVenue = useRef('');
  const [cursor, setCursor] = useState(() => new Date());
  const [home, setHome] = useState<HomeData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [phone, setPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [receiptBookingId, setReceiptBookingId] = useState('');
  const [detail, setDetail] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [detailName, setDetailName] = useState('');
  const [detailPhone, setDetailPhone] = useState('');
  const [detailEmail, setDetailEmail] = useState('');
  const [detailPlayers, setDetailPlayers] = useState(1);
  const [detailError, setDetailError] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [method, setMethod] = useState<'cash' | 'transfer'>('transfer');
  const [cashPaid, setCashPaid] = useState(0);
  const [drinkId, setDrinkId] = useState('');
  const [drinkQty, setDrinkQty] = useState(1);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraPrice, setExtraPrice] = useState(0);
  const [extraQty, setExtraQty] = useState(1);
  const [parentId, setParentId] = useState('');
  const [childId, setChildId] = useState('');
  const [playerCount, setPlayerCount] = useState(1);
  const [playTime, setPlayTime] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [printing, setPrinting] = useState(false);
  const printingRef = useRef(false);
  const [printSlip, setPrintSlip] = useState<PrintSlip | null>(null);
  const [mounted, setMounted] = useState(false);
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
      setParentId('');
      setChildId('');
      setPlayTime('');
    }
    seenVenue.current = stamp;
    load().catch(() => undefined);
    const timer = window.setInterval(() => { load().catch(() => undefined); }, 10000);
    return () => window.clearInterval(timer);
  }, [cursor, scope.ready, scope.venueId, scope.isSystem]);
  useEffect(() => {
    api<{ user: Me }>('/api/v1/auth/me').then((r) => setCashier(r.user?.username || '')).catch(() => undefined);
  }, []);
  const seenSlip = useRef<PrintSlip | null>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!printSlip) {
      seenSlip.current = null;
      return;
    }
    if (seenSlip.current === printSlip) return;
    seenSlip.current = printSlip;
    let closed = false;
    function stopPrinting() {
      printingRef.current = false;
      setPrinting(false);
    }
    function finish() {
      if (closed) return;
      closed = true;
      window.removeEventListener('afterprint', finish);
      stopPrinting();
      setLines([]);
      setGuestName('');
      setReceiptBookingId('');
      setPlayTime('');
      setMethod('transfer');
      setCashPaid(0);
      setPrintSlip(null);
    }
    function openBrowserPrint() {
      stopPrinting();
      window.addEventListener('afterprint', finish);
      requestAnimationFrame(() => window.print());
    }
    printReceiptQuiet().then((sent) => {
      if (seenSlip.current !== printSlip) return;
      if (sent) {
        finish();
        return;
      }
      openBrowserPrint();
    }).catch((err) => {
      if (seenSlip.current !== printSlip) return;
      if (err instanceof QzRefused) {
        stopPrinting();
        setReceiptError(`${err.message}. Chuột phải icon QZ Tray, mở Site Manager, chọn Allow cho trang này.`);
        setPrintSlip(null);
        return;
      }
      openBrowserPrint();
    });
    return () => window.removeEventListener('afterprint', finish);
  }, [printSlip]);

  const slots: Slot[] = home?.slots || [];
  const categories = [...(home?.categories || [])].sort((a, b) => Number(a.billMode !== 'escape') - Number(b.billMode !== 'escape') || a.name.localeCompare(b.name, 'vi'));
  const billMode = categories.find((category) => category.id === parentId)?.billMode;
  const booked = bookings.find((item) => item.id === receiptBookingId);
  const sessionPreview = playLines(billMode === 'escape' ? booked : undefined);
  const discountCode = lines.find((line) => line.kind === 'discount')?.code || '';
  const children = (home?.subGames || []).filter((game) => game.category.id === parentId);
  const child = children.find((game) => game.id === childId);
  const receiptTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const tendered = priceFromInput(cashPaid);

  function bumpLine(match: (line: Line) => boolean, create: Line) {
    setLines((cur) => {
      const index = cur.findIndex(match);
      if (index < 0) return [...cur, create];
      const next = [...cur];
      next[index] = { ...next[index], qty: next[index].qty + create.qty };
      return next;
    });
  }

  function bookingTime(booking: Booking) {
    const slot = (home?.slots || []).find((item) => item.slotIndex === booking.slotIndex);
    const [year, month, day] = booking.date.split('-');
    const dateLabel = day && month && year ? `${day}/${month}/${year}` : booking.date;
    return slot ? `${dateLabel} · ${slot.startTime}–${slot.endTime}` : dateLabel;
  }

  function payBooking(booking: Booking) {
    setPhone(booking.phone);
    setGuestName(booking.guestName);
    const game = home?.subGames.find((item) => item.roomId === booking.room.id && item.category.billMode === 'escape');
    const escapeId = game?.category.id || home?.categories.find((category) => category.billMode === 'escape')?.id || '';
    if (escapeId) setParentId(escapeId);
    const players = Math.max(1, booking.playerCount);
    setPlayerCount(players);
    setPlayTime(bookingTime(booking));
    setChildId(game?.id || '');
    setLines((cur) => {
      const kept = cur.filter((row) => row.kind !== 'subgame');
      if (!game) return kept;
      return [...kept, { description: `${game.name} · ${players} người`, qty: 1, unitPrice: game.basePrice, ledger: 'game', kind: 'subgame', categoryKind: 'escape', categoryId: game.category.id, subGameId: game.id, playerCount: players }];
    });
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

  function chooseParent(id: string) {
    if (id === parentId) return;
    const next = home?.categories.find((category) => category.id === id);
    setParentId(id);
    setChildId('');
    setLines((cur) => cur.filter((line) => line.kind !== 'subgame'));
    if (!next) setPlayTime('');
    if (!next || next.billMode !== 'escape') setReceiptBookingId('');
  }

  function addOtherGame() {
    if (!child) return;
    const players = Math.max(1, playerCount);
    const description = `${child.name} · ${players} người`;
    setLines((cur) => {
      const kept = cur.filter((line) => line.kind !== 'subgame' || line.categoryId === child.category.id);
      const index = kept.findIndex((line) => line.kind === 'subgame' && line.subGameId === child.id && line.unitPrice === child.basePrice);
      if (index >= 0) {
        const next = [...kept];
        next[index] = { ...next[index], description, playerCount: players, qty: 1 };
        return next;
      }
      return [...kept, { description, qty: 1, unitPrice: child.basePrice, ledger: 'game', kind: 'subgame', categoryKind: child.category.billMode, categoryId: child.category.id, subGameId: child.id, playerCount: players }];
    });
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

  function clearReceipt() {
    setLines([]);
    setPhone('');
    setGuestName('');
    setReceiptBookingId('');
    setParentId('');
    setChildId('');
    setPlayerCount(1);
    setPlayTime('');
    setDrinkId('');
    setDrinkQty(1);
    setExtraOpen(false);
    setExtraName('');
    setExtraPrice(0);
    setExtraQty(1);
    setMethod('transfer');
    setCashPaid(0);
    setReceiptError('');
  }

  function manualLines(time?: string) {
    const when = (time ?? playTime).trim();
    return when ? [`Thời gian: ${when}`] : [];
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
    if (printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    setReceiptError('');
    try {
    const receipt = await api<{ bills: { lines: { description: string; qty: number; unitPrice: number }[] }[]; booking: PlaySession | null; playTime: string; playSession: string; venue: { name: string; address: string } }>('/api/v1/receipts', {
      method: 'POST',
      body: JSON.stringify(scope.body({ phone, guestName, bookingId: billMode === 'escape' ? receiptBookingId || undefined : undefined, playTime, paymentMethod: method, lines })),
    });
    load().catch(() => undefined);
    const rows = receipt.bills.flatMap((b) => b.lines);
    const total = rows.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const head = [customerLabel() ? `Khách: ${customerLabel()}` : '', ...playLines(receipt.booking), ...manualLines(receipt.playTime)].filter(Boolean);
    setPrintSlip({
      venueName: receipt.venue.name,
      address: receipt.venue.address,
      head,
      rows,
      total,
      pay: method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN',
      cashPaid: method === 'cash' ? tendered : null,
      cashier,
    });
    } catch (err) {
      printingRef.current = false;
      setPrinting(false);
      throw err;
    }
  }

  function openDetail(booking: Booking) {
    setDetail(booking);
    setDetailName(booking.guestName);
    setDetailPhone(booking.phone);
    setDetailEmail(booking.email || '');
    setDetailPlayers(booking.playerCount);
    setDetailError('');
  }

  async function saveDetail(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!detail || detail.paid) return;
    setDetailSaving(true);
    setDetailError('');
    try {
      await api(`/api/v1/bookings/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ guestName: detailName, phone: detailPhone, email: detailEmail, playerCount: detailPlayers }),
      });
      if (receiptBookingId === detail.id) {
        const players = Math.max(1, detailPlayers);
        setGuestName(detailName.trim());
        setPhone(detailPhone.trim());
        setPlayerCount(players);
        setLines((cur) => cur.map((line) => {
          if (line.kind !== 'subgame') return line;
          const name = line.description.replace(/ · \d+ người$/, '');
          return { ...line, playerCount: players, description: `${name} · ${players} người` };
        }));
      }
      await load();
      setDetail(null);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Có lỗi');
    } finally {
      setDetailSaving(false);
    }
  }

  function bookingCard(b: Booking) {
    const paid = Boolean(b.paid);
    const selected = receiptBookingId === b.id;
    return (
      <article key={b.id} className={`mb-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 ${selected ? 'ring-2 ring-blue-700' : ''}`}>
        <div className={`flex items-center gap-1 px-2 py-1 text-white ${paid ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{b.room.name}</p>
          {!paid && (
            <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md bg-red-50 text-red-700" aria-label="Hủy" onClick={() => setCancelTarget(b)}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
          <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md bg-red-50 text-blue-700" aria-label="Chi tiết" onClick={() => openDetail(b)}>
            <Info className="size-4" aria-hidden />
          </button>
        </div>
        <div className="px-2 py-1">
          <p className="text-sm">{b.guestName}</p>
          <p className="text-sm">{b.phone}</p>
        </div>
        <div className="px-2 pb-2">
          <button className={`min-h-9 w-full rounded-lg px-2 text-xs font-semibold ${paid ? 'cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'}`} disabled={paid} onClick={() => payBooking(b)}>Thanh toán</button>
        </div>
      </article>
    );
  }

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3rem)] lg:overflow-hidden">
    <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_350px] lg:overflow-hidden">
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
          <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: '112px repeat(7, minmax(140px, 1fr))' }}>
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
            <p className="text-base font-bold text-slate-900">Thiết lập thông tin đơn</p>
            <AdminSelect label="Phòng chơi" value={parentId} onChange={chooseParent} options={[{ value: '', label: 'Chọn phòng' }, ...categories.map((category) => ({ value: category.id, label: category.billMode === 'escape' ? `${category.name} · Đặt lịch` : category.name }))]} />
            <input className="admin-input" placeholder="Tên khách" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <input className="admin-input" placeholder="SĐT khách" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {parentId && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <AdminSelect label="Game" value={childId} onChange={setChildId} options={[{ value: '', label: 'Chọn game' }, ...children.map((game) => ({ value: game.id, label: game.name, hint: `${vnd(game.basePrice)} đ` }))]} />
                <label className="block space-y-1">
                  <span className="admin-muted">Thời gian</span>
                  <input className="admin-input" placeholder="Ví dụ 14:00–16:00" value={playTime} onChange={(event) => setPlayTime(event.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="admin-muted">Số người</span>
                  <input className="admin-input" type="number" min={1} value={playerCount} onChange={(event) => setPlayerCount(Math.max(1, Number(event.target.value) || 1))} />
                </label>
                <Button disabled={!childId} onClick={addOtherGame}>Thêm game</Button>
              </div>
            )}
            <AdminSelect searchable label="Đồ uống" value={drinkId} onChange={setDrinkId} options={[{ value: '', label: 'Đồ uống' }, ...(home?.drinks || []).map((drink) => ({ value: drink.id, label: drink.name, hint: `${vnd(drink.price)} đ` }))]} />
            {drinkId && (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input className="admin-input" type="number" min={1} aria-label="Số lượng đồ uống" placeholder="Số lượng" value={drinkQty} onChange={(e) => setDrinkQty(Math.max(1, Number(e.target.value) || 1))} />
                <Button onClick={() => {
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
            )}
            <div className="space-y-2">
              <button type="button" className="admin-input flex w-full items-center justify-between gap-2 text-left font-medium" aria-expanded={extraOpen} onClick={() => setExtraOpen((open) => !open)}>
                <span>Extra</span>
                <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${extraOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {extraOpen && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <input className="admin-input" placeholder="Tên mặt hàng" value={extraName} onChange={(e) => setExtraName(e.target.value)} />
                  <input className="admin-input" type="number" min={0} placeholder="Giá (nghìn)" value={extraPrice || ''} onChange={(e) => setExtraPrice(Number(e.target.value))} />
                  <label className="block space-y-1">
                    <span className="admin-muted">Số lượng</span>
                    <input className="admin-input" type="number" min={1} aria-label="Số lượng extra" value={extraQty} onChange={(e) => setExtraQty(Math.max(1, Number(e.target.value) || 1))} />
                  </label>
                  <p className="admin-muted admin-money">Thành tiền {vnd(extraQty * priceFromInput(extraPrice))} đ</p>
                  <Button disabled={!extraName.trim()} onClick={() => {
                    const name = extraName.trim();
                    const unitPrice = priceFromInput(extraPrice);
                    bumpLine(
                      (line) => line.kind === 'extra_manual' && line.description === name && line.unitPrice === unitPrice,
                      { description: name, qty: extraQty, unitPrice, ledger: 'game', kind: 'extra_manual' },
                    );
                    setExtraName('');
                    setExtraQty(1);
                  }}>Thêm extra</Button>
                </div>
              )}
            </div>
            <AdminSelect label="Mã giảm giá" value={discountCode} onChange={applyDiscount} options={[{ value: '', label: 'Không giảm' }, ...(home?.discounts || []).map((discount) => ({ value: discount.code, label: discount.code, hint: `-${vnd(discount.amount)}` }))]} />
            <AdminSelect label="Hình thức thanh toán" value={method} onChange={(next) => {
              const picked = next as 'cash' | 'transfer';
              setMethod(picked);
              if (picked !== 'cash') setCashPaid(0);
            }} options={[{ value: 'transfer', label: 'Chuyển khoản' }, { value: 'cash', label: 'Tiền mặt' }]} />
            {method === 'cash' && (
              <label className="block space-y-1">
                <span className="admin-muted">Tiền khách trả (nghìn đồng)</span>
                <input className="admin-input" type="number" min={0} placeholder="Tiền khách trả" value={cashPaid || ''} onChange={(event) => setCashPaid(Math.max(0, Number(event.target.value) || 0))} />
              </label>
            )}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-base font-bold text-slate-900">Danh sách thanh toán</p>
            {lines.map((line, i) => (
              <div key={`${line.kind}-${line.description}-${line.unitPrice}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">{line.description} x{line.qty}</span>
                <span className="admin-money">{vnd(line.qty * line.unitPrice)}</span>
                <Button variant="ghost" className="border-red-200 text-red-700" onClick={() => removeLine(i)}>Xóa</Button>
              </div>
            ))}
            {!lines.length && <p className="admin-muted">Chưa có dữ liệu.</p>}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-base font-bold text-slate-900">Hóa đơn</p>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800">
            <div className="flex items-start">
              <div className="w-1/2 min-w-0 pr-2">
                <p className="text-sm font-semibold">{home?.venue.name || 'Phiếu thu'}</p>
                <p className="break-words text-slate-500">{home?.venue.address}</p>
              </div>
              <img src="/logo.png" alt="" className="w-1/2 shrink-0" />
            </div>
            <p className="my-2 border-t border-dashed border-slate-300" />
            {customerLabel() && <p>Khách: {customerLabel()}</p>}
            {sessionPreview.map((row) => <p key={row}>{row}</p>)}
            {manualLines().map((row) => <p key={row}>{row}</p>)}
            {(customerLabel() || sessionPreview.length > 0 || manualLines().length > 0) && <p className="my-2 border-t border-dashed border-slate-300" />}
            {lines.map((line) => (
              <div key={`${line.kind}-${line.description}-${line.unitPrice}`} className="mb-1 flex justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{line.description} x{line.qty}</span>
                <span>{vnd(line.qty * line.unitPrice)}</span>
              </div>
            ))}
            {!lines.length && <p className="text-center text-slate-400">Chưa có dữ liệu</p>}
            <p className="my-2 border-t border-dashed border-slate-300" />
            <p className="flex justify-between font-semibold"><span>TỔNG</span><span>{vnd(receiptTotal)}</span></p>
            <p className="flex justify-between gap-2"><span>Thanh toán: {method === 'cash' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'}</span>{method === 'cash' && <span>{vnd(tendered)}</span>}</p>
            {method === 'cash' && (tendered > 0 && tendered < receiptTotal
              ? <p className="flex justify-between"><span>Còn thiếu</span><span>{vnd(receiptTotal - tendered)}</span></p>
              : <p className="flex justify-between"><span>Trả lại:</span><span>{vnd(Math.max(0, tendered - receiptTotal))}</span></p>)}
            {cashier && <p>Thu ngân: {cashier}</p>}
          </div>
          </div>
          {receiptError && <p className="text-sm text-red-600">{receiptError}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={printing || !phone || !lines.length} onClick={() => printReceipt().catch((err) => setReceiptError(err instanceof Error ? err.message : 'Có lỗi'))}>{printing ? 'Đang in...' : 'Lưu và in'}</Button>
            <Button variant="ghost" className="border-red-200 bg-red-50 text-red-700" onClick={clearReceipt}>Hủy bỏ</Button>
          </div>
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
    </div>
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Hủy ca"
        description={cancelTarget ? `Hủy ca ${cancelTarget.room.name} của ${cancelTarget.guestName || cancelTarget.phone}?` : ''}
        confirmLabel="Hủy ca"
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        onConfirm={() => {
          if (!cancelTarget) return;
          const id = cancelTarget.id;
          setCancelTarget(null);
          api(`/api/v1/bookings/${id}/cancel`, { method: 'POST' }).then(() => {
            if (detail?.id === id) setDetail(null);
            return load();
          }).catch(() => load());
        }}
      />
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDetail(null)}>
          <div role="dialog" aria-modal="true" aria-label="Chi tiết ca chơi" className="admin-card w-full max-w-sm space-y-2" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-title">Chi tiết ca</h2>
            <p className="text-sm"><span className="font-semibold">Game:</span> {detail.room.name}</p>
            <p className="text-sm"><span className="font-semibold">Thời gian:</span> {detail.date} · {slots.find((slot) => slot.slotIndex === detail.slotIndex)?.startTime} – {slots.find((slot) => slot.slotIndex === detail.slotIndex)?.endTime}</p>
            {detail.paid ? (
              <>
                <p className="text-sm"><span className="font-semibold">Tên khách:</span> {detail.guestName}</p>
                <p className="text-sm"><span className="font-semibold">SĐT:</span> {detail.phone}</p>
                <p className="text-sm"><span className="font-semibold">Email:</span> {detail.email}</p>
                <p className="text-sm"><span className="font-semibold">Số người:</span> {detail.playerCount}</p>
              </>
            ) : (
              <form id="detail-form" className="space-y-2" onSubmit={saveDetail}>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Tên khách:</span>
                  <input className="admin-input" value={detailName} onChange={(e) => setDetailName(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">SĐT:</span>
                  <input className="admin-input" value={detailPhone} onChange={(e) => setDetailPhone(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Email:</span>
                  <input className="admin-input" value={detailEmail} onChange={(e) => setDetailEmail(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Số người:</span>
                  <input className="admin-input" type="number" min={1} value={detailPlayers} onChange={(e) => setDetailPlayers(Number(e.target.value) || 1)} />
                </label>
                {detailError && <p className="text-sm text-red-600">{detailError}</p>}
              </form>
            )}
            {detail.sessionCode && <p className="text-sm"><span className="font-semibold">Mã ca:</span> {detail.sessionCode}</p>}
            <p className="text-sm"><span className="font-semibold">Trạng thái:</span> {detail.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
            <div className="flex gap-2">
              {!detail.paid && <Button className="flex-1" type="submit" form="detail-form" disabled={detailSaving}>{detailSaving ? 'Đang lưu...' : 'Lưu'}</Button>}
              <Button variant="ghost" className="flex-1" type="button" onClick={() => setDetail(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
      {mounted && printSlip && createPortal(
        <div id="bill-print">
          <div className="bill-top">
            <div>
              <div className="bill-venue">{printSlip.venueName}</div>
              <div>{printSlip.address}</div>
            </div>
            <img className="bill-logo" alt="" src="/logo.png" />
          </div>
          <pre>{formatSlip(printSlip)}</pre>
          <div className="bill-feed" aria-hidden="true"><span /></div>
        </div>,
        document.body,
      )}
    </div>
  );
}
