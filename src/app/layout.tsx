import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AssetFlow — Enterprise Asset & Resource Management',
    template: '%s | AssetFlow',
  },
  description: 'Track, allocate, and maintain physical assets and shared bookable resources across your organization. Multi-location, multi-department, with full audit trails.',
  keywords: ['asset management', 'resource tracking', 'inventory', 'allocation', 'maintenance', 'audit', 'enterprise'],
  authors: [{ name: 'AssetFlow' }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.jpg', type: 'image/jpeg' },
    ],
    apple: '/icon.jpg',
  },
  openGraph: {
    title: 'AssetFlow — Enterprise Asset & Resource Management',
    description: 'Track, allocate, and maintain physical assets and shared bookable resources across your organization.',
    type: 'website',
    siteName: 'AssetFlow',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
