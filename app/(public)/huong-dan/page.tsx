'use client';

import { useHomeState } from '@/components/public-shell';

export default function GuidePage() {
  const { data } = useHomeState();
  if (!data) return <p>Đang tải...</p>;
  return (
    <article className="max-w-2xl whitespace-pre-wrap leading-7">
      <h1 className="mb-4 text-3xl font-bold">Hướng dẫn cách chơi</h1>
      {data.cms?.guide}
    </article>
  );
}
