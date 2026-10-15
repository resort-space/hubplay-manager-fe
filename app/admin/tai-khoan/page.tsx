'use client';

import { useEffect, useState } from 'react';
import { AdminSelect } from '@/components/ui/admin-select';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Venue } from '@/lib/types';

type Admin = { id: string; username: string; role: string; active: boolean; venue: { id: string; name: string } | null };

const roleLabel: Record<string, string> = { counter_admin: 'Admin quầy', edit_admin: 'Edit-admin', system_admin: 'System-admin' };

export default function AccountsPage() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('counter_admin');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [error, setError] = useState('');
  async function load() { setRows(await api<Admin[]>('/api/v1/admins')); }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Venue[]>('/api/v1/venues').then((list) => {
      setVenues(list);
      setVenueId(list.find((venue) => venue.active !== false)?.id || list[0]?.id || '');
    }).catch((e) => setError(e.message));
  }, []);
  return (
    <div className="admin-card mx-auto max-w-lg">
      <h1 className="admin-title mb-4">Tài khoản admin</h1>
      <form className="mb-4 grid gap-2" onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await api('/api/v1/admins', { method: 'POST', body: JSON.stringify({ username, password, role, venueId }) });
          setUsername(''); setPassword('');
          load();
        } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi'); }
      }}>
        <input className="admin-input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="admin-input" placeholder="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <AdminSelect label="Role" value={role} onChange={setRole} options={[{ value: 'counter_admin', label: 'Admin quầy' }, { value: 'edit_admin', label: 'Edit-admin' }]} />
        <AdminSelect label="Cơ sở" value={venueId} onChange={setVenueId} options={venues.map((venue) => ({ value: venue.id, label: venue.name }))} />
        <Button type="submit" disabled={!venueId}>Tạo và gán role</Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.map((row) => (
        <p key={row.id} className="border-b border-slate-100 py-3 text-sm">{row.username}<br /><span className="admin-muted">{roleLabel[row.role] || row.role}{row.venue ? ` · ${row.venue.name}` : ''}</span></p>
      ))}
    </div>
  );
}
