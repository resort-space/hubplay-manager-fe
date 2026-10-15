'use client';

import { useEffect, useState } from 'react';
import { useAdminVenue, VenueBar } from '@/components/admin-venue';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { HomeData } from '@/lib/types';

export default function CmsPage() {
  const scope = useAdminVenue();
  const [guide, setGuide] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [reviews, setReviews] = useState('');
  useEffect(() => {
    if (!scope.ready || (scope.isSystem && !scope.venueId)) return;
    api<HomeData>(scope.path('/api/v1/home')).then((d) => {
      setGuide(d.cms?.guide || '');
      setPriceNote(d.cms?.priceNote || '');
      setReviews(d.cms?.reviews || '');
    });
  }, [scope.ready, scope.venueId, scope.isSystem]);
  return (
    <div className="mx-auto max-w-2xl">
      <VenueBar venues={scope.venues} venueId={scope.venueId} onChange={scope.choose} />
    <form className="admin-card grid gap-3" onSubmit={async (e) => { e.preventDefault(); await api('/api/v1/cms', { method: 'POST', body: JSON.stringify(scope.body({ guide, priceNote, reviews })) }); }}>
      <h1 className="admin-title">Nội dung trang khách</h1>
      <label className="admin-label">Hướng dẫn
        <textarea className="admin-input mt-1 min-h-40" value={guide} onChange={(e) => setGuide(e.target.value)} />
      </label>
      <label className="admin-label">Ghi chú giá
        <input className="admin-input mt-1" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
      </label>
      <label className="admin-label">Review (Tên|Nội dung)
        <textarea className="admin-input mt-1 min-h-32" value={reviews} onChange={(e) => setReviews(e.target.value)} placeholder="Tên|Nội dung" />
      </label>
      <Button type="submit" className="w-fit">Lưu</Button>
    </form>
    </div>
  );
}
