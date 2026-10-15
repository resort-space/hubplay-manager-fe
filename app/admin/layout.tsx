'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BadgePercent, Building2, CalendarDays, ChartColumn, CircleCheck, Clock3, CupSoda, DoorOpen, FileText, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound, type LucideIcon } from 'lucide-react';
import { beVietnam } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

const links: { href: string; label: string; icon: LucideIcon; role: string }[] = [
  { href: '/admin/quay', label: 'Quầy', icon: CalendarDays, role: 'counter_admin' },
  { href: '/admin/phan-ca', label: 'Phân 13 ca', icon: Clock3, role: 'edit_admin' },
  { href: '/admin/phong', label: 'Phòng', icon: DoorOpen, role: 'edit_admin' },
  { href: '/admin/do-uong', label: 'Đồ uống', icon: CupSoda, role: 'edit_admin' },
  { href: '/admin/ma-giam', label: 'Mã giảm', icon: BadgePercent, role: 'edit_admin' },
  { href: '/admin/noi-dung', label: 'Nội dung', icon: FileText, role: 'edit_admin' },
  { href: '/admin/chot-ca', label: 'Chốt ca', icon: CircleCheck, role: 'edit_admin' },
  { href: '/admin/doanh-thu', label: 'Doanh thu tổng', icon: ChartColumn, role: 'system_admin' },
  { href: '/admin/co-so', label: 'Cơ sở', icon: Building2, role: 'system_admin' },
  { href: '/admin/tai-khoan', label: 'Tài khoản', icon: UserRound, role: 'system_admin' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (window.localStorage.getItem('admin-nav') === 'collapsed') setCollapsed(true);
  }, []);
  useEffect(() => {
    if (path === '/admin/login') return;
    api<{ user: Me }>('/api/v1/auth/me')
      .then((r) => {
        if (r.user?.kind !== 'admin') router.push('/admin/login');
        else setMe(r.user);
      })
      .catch(() => router.push('/admin/login'));
  }, [path, router]);
  useEffect(() => { setOpen(false); }, [path]);

  if (path === '/admin/login') {
    return <div className={`${beVietnam.className} admin min-h-screen`}>{children}</div>;
  }
  const role = me?.role;
  const visible = links.filter((item) => role === 'system_admin' || role === item.role || (role === 'edit_admin' && item.role === 'edit_admin'));
  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem('admin-nav', value ? 'open' : 'collapsed');
      return !value;
    });
  }
  const nav = (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {visible.map((item) => (
        <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} className={`admin-nav gap-2 ${path === item.href ? 'admin-nav-on' : ''} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <item.icon className="size-5 shrink-0" aria-hidden />
          <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        </Link>
      ))}
      <button
        className={`admin-nav mt-auto gap-2 text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
        title="Thoát"
        aria-label="Thoát"
        onClick={async () => { await api('/api/v1/auth/logout', { method: 'POST' }); router.push('/admin/login'); }}
      >
        <LogOut className="size-5 shrink-0" aria-hidden />
        <span className={collapsed ? 'lg:hidden' : ''}>Thoát</span>
      </button>
    </nav>
  );
  return (
    <div className={`${beVietnam.className} admin min-h-screen`}>
      {open && <button className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-slate-200 bg-white p-4 transition-[width,transform] ${collapsed ? 'lg:w-20' : ''} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-4 flex items-center justify-between gap-2 px-2">
          <p className={`text-[18px] font-semibold tracking-tight ${collapsed ? 'lg:hidden' : ''}`}>Door Escape</p>
          <Button variant="ghost" className="hidden min-h-9 px-2 lg:inline-flex" onClick={toggleCollapsed} aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>
        {nav}
      </aside>
      <div className={`min-h-screen ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Button variant="ghost" className="px-3" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="size-4" /></Button>
          <p className="admin-label">Door Escape</p>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
