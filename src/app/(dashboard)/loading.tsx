import { SkeletonCard } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="border-b border-border/50 p-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="p-6 space-y-6">
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-muted/50 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-lg border bg-card animate-pulse" />
          <div className="h-64 rounded-lg border bg-card animate-pulse" style={{ animationDelay: '100ms' }} />
        </div>
      </div>
    </div>
  );
}
