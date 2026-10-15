'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { HomeData, Slot } from '@/lib/types';

export default function SlotsPage() {
  const scope = useAdminVenue();
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    api<HomeData>(scope.path('/api/v1/home')).then((d) => setSlots(d.slots));
  }, [scope.ready, scope.venueId, scope.isSystem]);
  return (
    <div className="mx-auto max-w-xl">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
      <div className="admin-card">
      <h1 className="admin-title mb-4">Phân 13 ca</h1>
      {slots.map((slot) => (
        <form key={slot.id} className="mb-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[2rem_1fr_1fr_auto]" onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          await api(`/api/v1/slots/${slot.id}`, { method: 'PATCH', body: JSON.stringify({ startTime: form.get('start'), endTime: form.get('end'), enabled: true }) });
        }}>
          <span className="admin-label">{slot.slotIndex}</span>
          <input name="start" defaultValue={slot.startTime} className="admin-input" aria-label="Giờ bắt đầu" />
          <input name="end" defaultValue={slot.endTime} className="admin-input" aria-label="Giờ kết thúc" />
          <Button type="submit">Lưu</Button>
        </form>
      ))}
      </div>
    </div>
  );
}
