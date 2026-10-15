'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api, vnd } from '@/lib/api';
import type { HomeData, Room, SubGame } from '@/lib/types';

type EscapeRoom = SubGame & { room: Room };

export default function RoomsPage() {
  const scope = useAdminVenue();
  const [home, setHome] = useState<HomeData | null>(null);
  const [editing, setEditing] = useState<{ roomId: string; gameId: string; description: string; tags: string } | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [price, setPrice] = useState(350000);
  const [error, setError] = useState('');
  const rooms = (home?.subGames ?? []).filter((game): game is EscapeRoom => game.category.kind === 'escape' && !!game.room);

  async function load() { setHome(await api<HomeData>(scope.path('/api/v1/home'))); }
  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    load();
  }, [scope.ready, scope.venueId, scope.isSystem]);

  function reset() {
    setEditing(null);
    setName('');
    setCode('');
    setError('');
  }

  return (
    <div>
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
    <div className="grid gap-4 lg:grid-cols-2">
      <form className="admin-card space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          const room = await api<{ id: string }>('/api/v1/rooms', { method: 'POST', body: JSON.stringify(scope.body({ id: editing?.roomId, name, code, capacity, ...(editing ? { description: editing.description } : {}) })) });
          await api('/api/v1/sub-games', { method: 'POST', body: JSON.stringify(scope.body({ id: editing?.gameId, name, code, basePrice: price, kind: 'escape', roomId: room.id, tags: editing ? editing.tags : 'kinh dị' })) });
          reset();
          load();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Có lỗi');
        }
      }}>
        <h1 className="admin-title">{editing ? 'Sửa phòng escape' : 'Thêm phòng escape'}</h1>
        <input className="admin-input" placeholder="Tên" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="admin-input" placeholder="Mã R3" value={code} onChange={(e) => setCode(e.target.value)} />
        <label className="admin-label">Sức chứa
          <input className="admin-input mt-1" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </label>
        <label className="admin-label">Giá
          <input className="admin-input mt-1" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit">{editing ? 'Lưu' : 'Thêm'}</Button>
        {editing && <Button type="button" variant="ghost" onClick={reset}>Hủy sửa</Button>}
      </form>
      <div className="admin-card">
        <h2 className="admin-label mb-2">Đang có</h2>
        {rooms.map((game) => (
          <div key={game.id} className="flex items-center gap-2 border-b border-slate-100 py-3 text-sm">
            <span className="min-w-0 flex-1">{game.code} · {game.name} · {game.room.capacity} người<br /><span className="admin-money admin-muted">{vnd(game.basePrice)} đ</span></span>
            <Button variant="ghost" onClick={() => { setEditing({ roomId: game.room.id, gameId: game.id, description: game.room.description, tags: game.tags }); setName(game.name); setCode(game.code); setCapacity(game.room.capacity); setPrice(game.basePrice); setError(''); }}>Sửa</Button>
            <Button variant="ghost" onClick={async () => {
              setError('');
              try {
                await api(scope.path(`/api/v1/rooms/${game.room.id}`), { method: 'DELETE' });
                if (editing?.roomId === game.room.id) reset();
                load();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Có lỗi');
              }
            }}>Xóa</Button>
          </div>
        ))}
        {!rooms.length && <p className="admin-muted">Chưa có phòng.</p>}
      </div>
    </div>
    </div>
  );
}
