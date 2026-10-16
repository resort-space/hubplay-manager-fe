'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api, priceFromInput, priceToInput, vnd } from '@/lib/api';
import type { DiscountCode } from '@/lib/types';

export default function DiscountPage() {
  const scope = useAdminVenue();
  const [rows, setRows] = useState<DiscountCode[]>([]);
  const [editing, setEditing] = useState('');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState(50);

  async function load() {
    setRows(await api<DiscountCode[]>(scope.path('/api/v1/discounts')));
  }

  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    load().catch(() => undefined);
  }, [scope.ready, scope.venueId, scope.isSystem]);

  function reset() {
    setEditing('');
    setCode('');
    setAmount(50);
  }

  return (
    <div className="mx-auto max-w-lg">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
      <div className="admin-card">
        <h1 className="admin-title mb-4">Mã giảm giá</h1>
        <form className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]" onSubmit={async (e) => {
          e.preventDefault();
          await api('/api/v1/discounts', { method: 'POST', body: JSON.stringify(scope.body({ id: editing || undefined, code, amount: priceFromInput(amount) })) });
          reset();
          load();
        }}>
          <input className="admin-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Mã" aria-label="Mã giảm" />
          <input className="admin-input" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Số tiền giảm, nghìn đồng" />
          <Button type="submit">{editing ? 'Lưu' : 'Thêm'}</Button>
        </form>
        {editing && <Button variant="ghost" className="mb-4" onClick={reset}>Hủy sửa</Button>}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 border-b border-slate-100 py-3 text-sm">
            <span className="min-w-0 flex-1">{row.code} · <span className="admin-money">{vnd(row.amount)} đ</span></span>
            <Button variant="ghost" onClick={() => { setEditing(row.id); setCode(row.code); setAmount(priceToInput(row.amount)); }}>Sửa</Button>
            <Button variant="ghost" onClick={async () => { await api(scope.path(`/api/v1/discounts/${row.id}`), { method: 'DELETE' }); if (editing === row.id) reset(); load(); }}>Xóa</Button>
          </div>
        ))}
        {!rows.length && <p className="admin-muted">Chưa có mã.</p>}
      </div>
    </div>
  );
}
