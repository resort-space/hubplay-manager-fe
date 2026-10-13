'use client';

import { useHomeState } from '@/components/public-shell';

export default function DatPhongPage() {
  const { data, openRoom } = useHomeState();
  if (!data) return <p>Đang tải...</p>;
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Đặt phòng</h1>
      <p className="mb-6 text-stone-400">Chọn phòng để mở lịch ca. Giữ chỗ xong, quầy sẽ gọi xác nhận.</p>
      <div className="grid gap-3">
        {data.rooms.map((room) => (
          <button key={room.id} onClick={() => openRoom(room)} className="rounded-xl border border-stone-800 px-4 py-4 text-left hover:border-[#e8c56b]">
            {room.name} · tối đa {room.capacity} người
          </button>
        ))}
      </div>
    </div>
  );
}
