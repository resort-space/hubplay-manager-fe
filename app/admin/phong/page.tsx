'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api, priceFromInput, priceToInput, vnd } from '@/lib/api';
import type { GameCategory, SubGame } from '@/lib/types';

export default function RoomsPage() {
  const scope = useAdminVenue();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const ordered = [...categories].sort((a, b) => Number(a.billMode !== 'escape') - Number(b.billMode !== 'escape') || a.name.localeCompare(b.name, 'vi'));

  async function load() {
    setCategories(await api<GameCategory[]>(scope.path('/api/v1/game-categories')));
  }

  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    load().catch((err) => setError(err instanceof Error ? err.message : 'Có lỗi'));
  }, [scope.ready, scope.venueId, scope.isSystem]);

  return (
    <div>
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form className="admin-card space-y-2" onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            await api('/api/v1/game-categories', { method: 'POST', body: JSON.stringify(scope.body({ name, billMode: 'board' })) });
            setName('');
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi');
          }
        }}>
          <h1 className="admin-title">Thêm phòng</h1>
          <input className="admin-input" placeholder="Tên phòng" value={name} onChange={(event) => setName(event.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit">Thêm</Button>
        </form>
        <div className="space-y-4">
          {ordered.map((category) => (
            <RoomCard key={category.id} category={category} onChange={load} onError={setError} body={scope.body} path={scope.path} />
          ))}
          {!ordered.length && <p className="admin-muted">Chưa có phòng.</p>}
        </div>
      </div>
    </div>
  );
}

function RoomCard({ category, onChange, onError, body, path }: { category: GameCategory; onChange: () => Promise<void>; onError: (message: string) => void; body: (data: Record<string, unknown>) => Record<string, unknown>; path: (url: string) => string }) {
  const [title, setTitle] = useState(category.name);
  const [gameName, setGameName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [gamePrice, setGamePrice] = useState(category.billMode === 'escape' ? 350 : 100);
  const [capacity, setCapacity] = useState(6);
  const [editing, setEditing] = useState<SubGame | null>(null);
  const escape = category.billMode === 'escape';

  useEffect(() => { setTitle(category.name); }, [category.name]);

  function resetGame() {
    setEditing(null);
    setGameName('');
    setGameCode('');
    setCapacity(6);
  }

  async function run(task: () => Promise<void>) {
    onError('');
    try {
      await task();
      await onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Có lỗi');
    }
  }

  return (
    <section className="admin-card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="admin-input min-w-0 flex-1" aria-label="Tên phòng" value={title} onChange={(event) => setTitle(event.target.value)} />
        {escape && <span className="admin-muted">Đặt lịch</span>}
        <Button variant="ghost" onClick={() => run(async () => { await api(`/api/v1/game-categories/${category.id}`, { method: 'PATCH', body: JSON.stringify(body({ name: title })) }); })}>Lưu tên</Button>
        <Button variant="ghost" onClick={() => run(async () => { await api(path(`/api/v1/game-categories/${category.id}`), { method: 'DELETE' }); })}>Xóa</Button>
      </div>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          if (escape) {
            const room = await api<{ id: string }>('/api/v1/rooms', { method: 'POST', body: JSON.stringify(body({ id: editing?.room?.id, name: gameName, code: gameCode, capacity, ...(editing?.room ? { description: editing.room.description } : {}) })) });
            await api('/api/v1/sub-games', { method: 'POST', body: JSON.stringify(body({ id: editing?.id, name: gameName, code: gameCode, basePrice: priceFromInput(gamePrice), categoryId: category.id, roomId: room.id, tags: editing?.tags || 'kinh dị' })) });
          } else {
            await api('/api/v1/sub-games', {
              method: 'POST',
              body: JSON.stringify(body({ id: editing?.id, name: gameName, code: gameCode, basePrice: priceFromInput(gamePrice), categoryId: category.id, pricingUnit: 'per_session' })),
            });
          }
          resetGame();
        });
      }}>
        <input className="admin-input" placeholder="Tên game" value={gameName} onChange={(event) => setGameName(event.target.value)} />
        <input className="admin-input" placeholder="Mã" value={gameCode} onChange={(event) => setGameCode(event.target.value)} />
        {escape && (
          <label className="admin-label">Sức chứa
            <input className="admin-input mt-1" type="number" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
          </label>
        )}
        <label className="admin-label">Giá (nghìn đồng)
          <input className="admin-input mt-1" type="number" min={0} value={gamePrice} onChange={(event) => setGamePrice(Number(event.target.value))} />
        </label>
        <Button type="submit">{editing ? 'Lưu game' : 'Thêm game'}</Button>
        {editing && <Button type="button" variant="ghost" onClick={resetGame}>Hủy sửa</Button>}
      </form>
      {(category.subGames || []).map((game) => (
        <div key={game.id} className="flex items-center gap-2 border-t border-slate-100 py-2 text-sm">
          <span className="min-w-0 flex-1">
            {game.code} · {game.name}{escape && game.room ? ` · ${game.room.capacity} người` : ''}
            <br />
            <span className="admin-money admin-muted">{vnd(game.basePrice)} đ</span>
          </span>
          <Button variant="ghost" onClick={() => { setEditing(game); setGameName(game.name); setGameCode(game.code); setGamePrice(priceToInput(game.basePrice)); setCapacity(game.room?.capacity || 6); }}>Sửa</Button>
          <Button variant="ghost" onClick={() => run(async () => {
            if (escape && game.room) await api(path(`/api/v1/rooms/${game.room.id}`), { method: 'DELETE' });
            else await api(path(`/api/v1/sub-games/${game.id}`), { method: 'DELETE' });
            if (editing?.id === game.id) resetGame();
          })}>Xóa</Button>
        </div>
      ))}
    </section>
  );
}
