'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('quay');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  return (
    <form
      className="admin-card mx-auto mt-16 grid max-w-sm gap-3 sm:mt-24"
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
      <h1 className="admin-title">Đăng nhập quản trị</h1>
      <label className="admin-label">Tài khoản
        <input className="admin-input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label className="admin-label">Mật khẩu
        <input className="admin-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Vào</Button>
      <p className="admin-muted">Dev: quay, editadmin, sysadmin / Admin@123</p>
    </form>
  );
}
