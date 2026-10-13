'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { HomeData, Me, Room } from '@/lib/types';
import { BookingModal } from './booking-modal';

type HomeState = { data: HomeData | null; error: string; openRoom: (room: Room) => void };

const HomeContext = createContext<HomeState>({ data: null, error: '', openRoom: () => undefined });
export function useHomeState() {
  return useContext(HomeContext);
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  const [me, setMe] = useState<Me>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    api<HomeData>('/api/v1/home').then(setData).catch((e) => setError(e.message));
    api<{ user: Me }>('/api/v1/auth/me').then((r) => setMe(r.user)).catch(() => setMe(null));
  }, []);

  const venue = data?.venue;
  return (
    <HomeContext.Provider value={{ data, error, openRoom: setRoom }}>
      <div className="min-h-screen bg-[#0c0a09] text-stone-100">
        <header className="sticky top-0 z-20 border-b border-stone-800 bg-[#0c0a09]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-[#e8c56b]">{venue?.name || 'Door Escape Room'}</Link>
            <nav className="flex flex-1 flex-wrap gap-3 text-sm text-stone-300">
              <Link href="/">Trang chủ</Link>
              <Link href="/dat-phong">Đặt phòng</Link>
              <Link href="/huong-dan">Hướng dẫn</Link>
              <Link href="/lich-trong">Lịch trống</Link>
              <Link href="/bang-gia">Bảng giá</Link>
              <Link href="/lien-he">Liên hệ</Link>
            </nav>
            <Link href="/tai-khoan" className="text-sm text-[#e8c56b]">{me?.kind === 'user' ? me.phone : 'Đăng nhập'}</Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-800 px-4 py-6 text-sm text-stone-400">
          <p>{venue?.name || 'Door Escape Room'}</p>
          <p>{venue?.address || '6 ngõ 78 đường Lương Ngọc Quyến'}</p>
        </footer>
        {room && <BookingModal room={room} onClose={() => setRoom(null)} />}
      </div>
    </HomeContext.Provider>
  );
}
