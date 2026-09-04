'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-notification';
import { formatDateTime } from '@/lib/utils';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Notifications | AssetFlow';
  }, []);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useFocusRefresh(fetchNotifications);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    fetchNotifications();
  };

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
    }
    toast.success('All caught up!', 'All notifications marked as read.');
    fetchNotifications();
  };

  const getNotificationIcon = (type: string) => {
    const colors: Record<string, string> = {
      ASSET_ASSIGNED: 'from-blue-500 to-blue-600',
      TRANSFER_REQUESTED: 'from-amber-500 to-amber-600',
      TRANSFER_APPROVED: 'from-emerald-500 to-emerald-600',
      TRANSFER_REJECTED: 'from-red-500 to-red-600',
      MAINTENANCE_REQUESTED: 'from-amber-500 to-amber-600',
      MAINTENANCE_APPROVED: 'from-emerald-500 to-emerald-600',
      MAINTENANCE_REJECTED: 'from-red-500 to-red-600',
      MAINTENANCE_RESOLVED: 'from-teal-500 to-teal-600',
      BOOKING_CONFIRMED: 'from-purple-500 to-purple-600',
      ROLE_CHANGE: 'from-indigo-500 to-indigo-600',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen">
      <Header title="Notifications" />
      <div className="p-6 space-y-6 page-enter">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-20" />
            ))}
          </div>
        ) : (
        <div className="space-y-3">
          {notifications.map((notification, i) => (
            <Card
              key={notification.id}
              className={cn(
                'transition-all duration-200 opacity-0 animate-fade-in',
                !notification.read
                  ? 'border-primary/30 bg-primary/5 hover:bg-primary/8'
                  : 'opacity-75 hover:opacity-100'
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getNotificationIcon(notification.type)} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{notification.type}</Badge>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <p className="text-sm mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(notification.createdAt)}</p>
                  </div>
                </div>
                {!notification.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(notification.id)} className="h-8 gap-1">
                    <Check className="h-3 w-3" /> Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {notifications.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="No notifications yet"
              description="You're all caught up! Notifications will appear here when there's activity."
            />
          )}
        </div>
        )}
      </div>
    </div>
  );
}
