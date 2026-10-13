'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

const links = [
  ['/admin/quay', 'Quầy', 'counter_admin'],
  ['/admin/phan-ca', 'Phân 13 ca', 'edit_admin'],
  ['/admin/phong', 'Phòng & game', 'edit_admin'],
  ['/admin/do-uong', 'Đồ uống', 'edit_admin'],
  ['/admin/noi-dung', 'Nội dung', 'edit_admin'],
  ['/admin/chot-ca', 'Chốt ca', 'edit_admin'],
  ['/admin/doanh-thu', 'Doanh thu tổng', 'system_admin'],
  ['/admin/tai-khoan', 'Tài khoản', 'system_admin'],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  useEffect(() => {
    if (path === '/admin/login') return;
    api<{ user: Me }>('/api/v1/auth/me')
      .then((r) => {
        if (r.user?.kind !== 'admin') router.push('/admin/login');
        else setMe(r.user);
      })
      .catch(() => router.push('/admin/login'));
  }, [path, router]);
  if (path === '/admin/login') return <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>;
  const role = me?.role;
  const visible = links.filter(([, , need]) => role === 'system_admin' || role === need || (role === 'edit_admin' && need === 'edit_admin'));
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3">
        <strong>Door Escape Room</strong>
        {visible.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'font-semibold text-blue-700' : 'text-slate-600'}>{label}</Link>
        ))}
        <button className="ml-auto text-sm" onClick={async () => { await api('/api/v1/auth/logout', { method: 'POST' }); router.push('/admin/login'); }}>Thoát</button>
      </header>
      <div className="p-4">{children}</div>
    </div>
  );
}
