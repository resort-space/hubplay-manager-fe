'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Admin = { id: string; username: string; role: string; active: boolean };

export default function AccountsPage() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('counter_admin');
  const [error, setError] = useState('');
  async function load() { setRows(await api<Admin[]>('/api/v1/admins')); }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-4 shadow">
      <h1 className="mb-3 text-xl font-bold">Tài khoản admin</h1>
      <form className="mb-4 grid gap-2" onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await api('/api/v1/admins', { method: 'POST', body: JSON.stringify({ username, password, role }) });
          setUsername(''); setPassword('');
          load();
        } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi'); }
      }}>
        <input className="rounded border px-2 py-1" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="rounded border px-2 py-1" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="rounded border px-2 py-1" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="counter_admin">Admin quầy</option>
          <option value="edit_admin">Edit-admin</option>
        </select>
        <button className="rounded bg-blue-600 px-3 py-2 text-white">Tạo và gán role</button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {rows.map((row) => <p key={row.id} className="border-b py-2">{row.username} · {row.role}</p>)}
    </div>
  );
}
