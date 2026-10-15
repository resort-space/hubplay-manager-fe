'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { HomeData, Me, Room, Venue } from '@/lib/types';
import { BookingModal } from './booking-modal';

type HomeState = { data: HomeData | null; error: string; venueId: string; openRoom: (room: Room) => void };

const HomeContext = createContext<HomeState>({ data: null, error: '', venueId: '', openRoom: () => undefined });
export function useHomeState() {
  return useContext(HomeContext);
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  const [me, setMe] = useState<Me>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');

  useEffect(() => {
    api<{ user: Me }>('/api/v1/auth/me').then((r) => setMe(r.user)).catch(() => setMe(null));
    api<Venue[]>('/api/v1/venues').then((list) => {
      const active = list.filter((venue) => venue.active !== false);
      setVenues(active);
      const saved = window.localStorage.getItem('hub-venue') || '';
      setVenueId(active.find((venue) => venue.id === saved)?.id || active[0]?.id || '');
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!venueId) return;
    setRoom(null);
    api<HomeData>(`/api/v1/home?venueId=${encodeURIComponent(venueId)}`).then(setData).catch((e) => setError(e.message));
  }, [venueId]);

  function chooseVenue(id: string) {
    setVenueId(id);
    window.localStorage.setItem('hub-venue', id);
  }

  const venue = data?.venue;
  return (
    <HomeContext.Provider value={{ data, error, venueId, openRoom: setRoom }}>
      <div className="min-h-screen bg-[#0c0a09] text-stone-100">
        <header className="sticky top-0 z-20 border-b border-stone-800 bg-[#0c0a09]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-[#e8c56b]">{venue?.name || 'Door Escape'}</Link>
            {venues.length > 1 && (
              <select className="rounded bg-black px-2 py-1 text-sm" aria-label="Cơ sở" value={venueId} onChange={(e) => chooseVenue(e.target.value)}>
                {venues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            )}
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
          <p>{venue?.name || 'Door Escape'}</p>
          <p>{venue?.address || '6 ngõ 78 đường Lương Ngọc Quyến'}</p>
        </footer>
        {room && <BookingModal room={room} venueId={venueId} onClose={() => setRoom(null)} />}
      </div>
    </HomeContext.Provider>
  );
}
