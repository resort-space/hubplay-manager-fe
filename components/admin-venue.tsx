'use client';

import { useEffect, useState } from 'react';
import { AdminSelect } from '@/components/ui/admin-select';
import { api } from '@/lib/api';
import type { Me, Venue } from '@/lib/types';

export function useAdminVenue() {
  const [role, setRole] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      const res = await api<{ user: Me }>('/api/v1/auth/me');
      if (stop) return;
      const nextRole = res.user?.role || '';
      setRole(nextRole);
      if (nextRole === 'system_admin') {
        const list = await api<Venue[]>('/api/v1/venues');
        if (stop) return;
        setVenues(list);
        const saved = window.sessionStorage.getItem('admin-venue') || '';
        setVenueId(list.find((venue) => venue.id === saved)?.id || list.find((venue) => venue.active !== false)?.id || list[0]?.id || '');
      }
      setReady(true);
    })().catch(() => { if (!stop) setReady(true); });
    return () => { stop = true; };
  }, []);

  const isSystem = role === 'system_admin';

  function choose(id: string) {
    setVenueId(id);
    window.sessionStorage.setItem('admin-venue', id);
  }

  function path(url: string) {
    if (!isSystem || !venueId) return url;
    return `${url}${url.includes('?') ? '&' : '?'}venueId=${encodeURIComponent(venueId)}`;
  }

  function body<T extends Record<string, unknown>>(data: T) {
    if (!isSystem || !venueId) return data;
    return { ...data, venueId };
  }

  return { ready, isSystem, venues, venueId, choose, path, body };
}

export function VenueBar({ venues, venueId, onChange }: { venues: Venue[]; venueId: string; onChange: (id: string) => void }) {
  if (!venues.length) return null;
  return (
    <div className="mb-4 max-w-sm">
      <AdminSelect
        label="Cơ sở"
        value={venueId}
        onChange={onChange}
        options={venues.map((venue) => ({ value: venue.id, label: venue.active === false ? `${venue.name} (đã khóa)` : venue.name }))}
      />
    </div>
  );
}
