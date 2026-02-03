import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '看護必要度判定サポート',
  description: 'Nursing Necessity Assessment Support System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
