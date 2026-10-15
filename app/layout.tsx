import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Door Escape',
  description: 'Đặt phòng Door Escape',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
