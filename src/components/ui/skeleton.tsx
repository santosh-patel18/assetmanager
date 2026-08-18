import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('skeleton', className)} {...props} />
  );
}

export function SkeletonLine({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} {...props} />;
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-5 space-y-3', className)} {...props}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-3 w-28 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6, className, ...props }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn('rounded-lg border overflow-hidden', className)} {...props}>
      {/* Header */}
      <div className="bg-muted/50 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-t p-3 flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={`r-${rowIdx}-c-${colIdx}`}
              className={cn('h-4 flex-1 rounded', colIdx === 0 && 'w-24 flex-none')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-8 w-8 rounded-full', className)} {...props} />;
}
