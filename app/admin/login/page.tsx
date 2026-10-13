'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('quay');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  return (
    <form
      className="mx-auto mt-24 grid max-w-sm gap-3 rounded-xl bg-white p-6 shadow"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const user = await api<{ role: string }>('/api/v1/auth/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
          router.push(user.role === 'counter_admin' ? '/admin/quay' : '/admin/phan-ca');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Sai tài khoản');
        }
      }}
    >
      <h1 className="text-xl font-bold">Đăng nhập quản trị</h1>
      <input className="rounded border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input className="rounded border px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Vào</button>
      <p className="text-xs text-slate-500">Dev: quay, editadmin, sysadmin / Admin@123</p>
    </form>
  );
}
