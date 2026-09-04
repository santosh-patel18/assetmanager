'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import {
  Package, PackageCheck, Wrench, CalendarDays, ArrowLeftRight,
  AlertTriangle, PlusCircle, BookOpen, ClipboardCheck, Clock,
  Inbox,
} from 'lucide-react';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import { useFocusRefresh } from '@/lib/use-focus-refresh';

interface DashboardData {
  kpi: {
    availableAssets: number;
    allocatedAssets: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    overdueReturns: number;
  };
  overdueReturns: Array<{
    id: string;
    expectedReturnDate: string;
    asset: { id: string; name: string; assetTag: string };
  }>;
  upcomingReturns: Array<{
    id: string;
    expectedReturnDate: string;
    asset: { id: string; name: string; assetTag: string };
  }>;
}

const kpiConfig = [
  { key: 'availableAssets', label: 'Available Assets', icon: Package, color: 'from-emerald-500 to-emerald-600' },
  { key: 'allocatedAssets', label: 'Allocated Assets', icon: PackageCheck, color: 'from-blue-500 to-blue-600' },
  { key: 'maintenanceToday', label: 'Maintenance Active', icon: Wrench, color: 'from-amber-500 to-amber-600' },
  { key: 'activeBookings', label: 'Active Bookings', icon: CalendarDays, color: 'from-purple-500 to-purple-600' },
  { key: 'pendingTransfers', label: 'Pending Transfers', icon: ArrowLeftRight, color: 'from-cyan-500 to-cyan-600' },
  { key: 'overdueReturns', label: 'Overdue Returns', icon: AlertTriangle, color: 'from-red-500 to-red-600' },
] as const;

const quickActions = [
  { label: 'Register Asset', href: '/assets/register', icon: PlusCircle, color: 'from-indigo-500 to-indigo-600', roles: ['admin', 'asset_manager'] },
  { label: 'Book Resource', href: '/bookings', icon: BookOpen, color: 'from-purple-500 to-purple-600', roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Report Issue', href: '/maintenance', icon: Wrench, color: 'from-amber-500 to-amber-600', roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Start Audit', href: '/audits', icon: ClipboardCheck, color: 'from-teal-500 to-teal-600', roles: ['admin', 'asset_manager'] },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | AssetFlow';
  }, []);

  const fetchDashboard = useCallback(() => {
    const params = new URLSearchParams();
    if (locationFilter) params.set('locationId', locationFilter);
    fetch(`/api/dashboard?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [locationFilter]);

  useEffect(() => {
    fetchDashboard();
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || []));
  }, [fetchDashboard]);

  // Re-fetch when user returns to tab
  useFocusRefresh(fetchDashboard);

  const filteredActions = quickActions.filter(a => a.roles.includes(user?.role || 'employee'));

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 page-enter">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, <span className="gradient-text">{user?.name}</span>
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-muted-foreground text-sm">Here&apos;s your operational overview.</p>
              {locations.length > 0 && (
                <LocationTreeSelect
                  locations={locations}
                  value={locationFilter}
                  onChange={setLocationFilter}
                  placeholder="All Locations"
                  className="w-[220px]"
                />
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiConfig.map((kpi, index) => (
              <StatCard
                key={kpi.key}
                label={kpi.label}
                value={data?.kpi[kpi.key] ?? 0}
                icon={kpi.icon}
                gradient={kpi.color}
                delay={index * 100}
                badge={
                  kpi.key === 'overdueReturns' && (data?.kpi.overdueReturns ?? 0) > 0
                    ? { text: '!', variant: 'destructive' as const }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredActions.map((action, i) => (
              <Link key={action.href} href={action.href}>
                <Card
                  className="group cursor-pointer border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
                  style={{ animationDelay: `${600 + i * 80}ms` }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Overdue & Upcoming Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Returns */}
          <Card className="border-red-500/20">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="font-semibold text-lg">Overdue Returns</h3>
              </div>
              {data?.overdueReturns && data.overdueReturns.length > 0 ? (
                <div className="space-y-3">
                  {data.overdueReturns.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 table-row-hover">
                      <div>
                        <p className="font-medium text-sm">{item.asset.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.asset.assetTag}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Due: {new Date(item.expectedReturnDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No overdue returns"
                  description="All assets are returned on time. Great job! 🎉"
                  className="py-8"
                />
              )}
            </div>
          </Card>

          {/* Upcoming Returns */}
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <h3 className="font-semibold text-lg">Upcoming Returns</h3>
              </div>
              {data?.upcomingReturns && data.upcomingReturns.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingReturns.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 table-row-hover">
                      <div>
                        <p className="font-medium text-sm">{item.asset.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.asset.assetTag}</p>
                      </div>
                      <Badge variant="warning" className="text-xs">
                        {new Date(item.expectedReturnDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No upcoming returns"
                  description="No assets are scheduled for return."
                  className="py-8"
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
