'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'assets': 'Assets',
  'register': 'Register',
  'allocations': 'Allocations',
  'bookings': 'Bookings',
  'maintenance': 'Maintenance',
  'audits': 'Audits',
  'reports': 'Reports',
  'activity': 'Activity',
  'notifications': 'Notifications',
  'settings': 'Settings',
  'org': 'Organization',
};

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    // Check if segment is a UUID (dynamic route)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(segment);
    const label = isUuid
      ? segment.slice(0, 8) + '…'
      : routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return { href, label, isLast, isUuid };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
