'use client';

import { useHomeState } from '@/components/public-shell';

export default function HomePage() {
  const { data, error, openRoom } = useHomeState();
  if (error) return <p>{error}</p>;
  if (!data) return <p>Đang tải...</p>;
  const reviews = (data.cms?.reviews || '').split('\n').filter(Boolean);
  return (
    <div>
      <section className="mb-10 rounded-2xl border border-stone-800 bg-[radial-gradient(circle_at_top,#3a2418,transparent_55%)] px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-[#e8c56b]">Door Escape Room</p>
        <h1 className="mt-2 max-w-xl text-4xl font-bold">Phá án trong phòng tối</h1>
        <p className="mt-3 max-w-lg text-stone-300">{data.venue.address}</p>
      </section>
      <h2 className="mb-4 text-2xl font-semibold">Tất cả phòng chơi</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.rooms.map((room) => (
          <button key={room.id} onClick={() => openRoom(room)} className="rounded-xl border border-stone-800 bg-[#161311] p-5 text-left hover:border-[#e8c56b]">
            <p className="text-xs text-[#e8c56b]">{room.code}</p>
            <h3 className="text-xl font-semibold">{room.name}</h3>
            <p className="mt-2 text-sm text-stone-400">{room.description}</p>
          </button>
        ))}
      </div>
      <h2 className="mb-4 mt-10 text-2xl font-semibold">Review</h2>
      <div className="grid gap-3">
        {reviews.map((line) => {
          const [name, ...rest] = line.split('|');
          return (
            <blockquote key={line} className="rounded-xl border border-stone-800 p-4 text-sm text-stone-300">
              “{rest.join('|') || name}” <span className="mt-2 block text-[#e8c56b]">{rest.length ? name : ''}</span>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
