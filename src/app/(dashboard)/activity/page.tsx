'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatDateTime } from '@/lib/utils';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { Activity as ActivityIcon, User, Inbox } from 'lucide-react';
import type { ActivityLog } from '@/types';

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Activity Log | AssetFlow';
  }, []);

  const fetchActivity = useCallback(() => {
    setLoading(true);
    fetch(`/api/activity-log?page=${page}&limit=30`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);
  useFocusRefresh(fetchActivity);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('SIGNUP')) return 'from-emerald-500 to-emerald-600';
    if (action.includes('DELETE') || action.includes('REJECT')) return 'from-red-500 to-red-600';
    if (action.includes('APPROVE') || action.includes('RESOLVE')) return 'from-blue-500 to-blue-600';
    if (action.includes('CHANGE') || action.includes('UPDATE')) return 'from-amber-500 to-amber-600';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <div className="min-h-screen">
      <Header title="Activity Log" />
      <div className="p-6 space-y-6 page-enter">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Activity Timeline</h2>
          <p className="text-sm text-muted-foreground">{total} total events</p>
        </div>

        {loading ? (
          <div className="space-y-4 pl-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            description="Activity events will appear here as actions are performed."
            className="py-16"
          />
        ) : (
          <>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-12">
                    {/* Timeline dot */}
                    <div className={`absolute left-4 top-3 h-4 w-4 rounded-full bg-gradient-to-br ${getActionColor(log.action)} border-2 border-background`} />
                    <Card className="flex-1 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">{log.action}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{log.targetType}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-sm font-medium">{log.actor?.name}</span>
                          <Badge variant="secondary" className="text-[10px] capitalize">{log.actor?.role?.replace('_', ' ')}</Badge>
                        </div>
                        {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            <PaginationControls
              page={page}
              totalPages={Math.ceil(total / 30)}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
