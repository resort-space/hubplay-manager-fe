'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import type { Venue } from '@/lib/types';

const empty = { code: '', name: '', address: '', phone: '' };

export default function VenuesPage() {
  const [rows, setRows] = useState<Venue[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Venue | null>(null);

  async function load() {
    setRows(await api<Venue[]>('/api/v1/venues'));
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <form className="admin-card grid gap-2" onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await api('/api/v1/venues', { method: 'POST', body: JSON.stringify(form) });
          setForm(empty);
          await load();
        } catch (err) { setError(err instanceof Error ? err.message : 'Không tạo được'); }
      }}>
        <h1 className="admin-title">Cơ sở</h1>
        <input className="admin-input" placeholder="Tên cơ sở" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="admin-input" placeholder="Mã" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="admin-input" placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="admin-input" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button type="submit">Tạo cơ sở</Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.map((venue) => (
        <form key={venue.id} className="admin-card grid gap-2" onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          const data = new FormData(e.currentTarget);
          try {
            await api(`/api/v1/venues/${venue.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: data.get('name'),
                code: data.get('code'),
                address: data.get('address'),
                phone: data.get('phone'),
                active: data.get('active') === 'on',
              }),
            });
            await load();
          } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được'); }
        }}>
          <input name="name" className="admin-input" defaultValue={venue.name} aria-label="Tên cơ sở" />
          <input name="code" className="admin-input" defaultValue={venue.code} aria-label="Mã cơ sở" />
          <input name="address" className="admin-input" defaultValue={venue.address} aria-label="Địa chỉ" />
          <input name="phone" className="admin-input" defaultValue={venue.phone} aria-label="Số điện thoại" />
          <label className="admin-label flex items-center gap-2">
            <input name="active" type="checkbox" defaultChecked={venue.active !== false} />
            Đang mở
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="w-fit">Lưu</Button>
            <Button type="button" variant="ghost" onClick={() => setPending(venue)}>Xóa</Button>
          </div>
        </form>
      ))}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Xóa cơ sở"
        description={pending ? `Xóa cơ sở ${pending.name}?` : ''}
        confirmLabel="Xóa"
        onOpenChange={(open) => { if (!open) setPending(null); }}
        onConfirm={async () => {
          if (!pending) return;
          const id = pending.id;
          setPending(null);
          setError('');
          try {
            await api(`/api/v1/venues/${id}`, { method: 'DELETE' });
            await load();
          } catch (err) { setError(err instanceof Error ? err.message : 'Không xóa được'); }
        }}
      />
    </div>
  );
}
