'use client';

import { vnd } from '@/lib/api';
import { useHomeState } from '@/components/public-shell';

export default function PricePage() {
  const { data } = useHomeState();
  if (!data) return <p>Đang tải...</p>;
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Bảng giá</h1>
      <p className="mb-6 text-stone-400">{data.cms?.priceNote}</p>
      <div className="grid gap-3">
        {data.subGames.map((game) => (
          <div key={game.id} className="flex items-center justify-between rounded-xl border border-stone-800 px-4 py-3">
            <div>
              <p className="font-medium">{game.name}</p>
              <p className="text-sm text-stone-400">{game.category.name}</p>
            </div>
            <p className="text-[#e8c56b]">{vnd(game.basePrice)} đ</p>
          </div>
        ))}
      </div>
    </div>
  );
}
