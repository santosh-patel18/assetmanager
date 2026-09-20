'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/components/ui/toast-notification';
import { getStatusVariant, formatDateTime } from '@/lib/utils';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { CalendarDays, Plus, X, Loader2 } from 'lucide-react';
import type { ResourceBooking, Asset } from '@/types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [resources, setResources] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ resource_id: '', start_time: '', end_time: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const toast = useToast();

  useEffect(() => {
    document.title = 'Bookings | AssetFlow';
  }, []);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    fetch(`/api/bookings?page=${page}&limit=20`).then(r => r.json()).then(d => {
      setBookings(d.bookings || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || Math.ceil((d.total || 0) / 20));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    fetchBookings();
    fetch('/api/assets?bookable=true&limit=100').then(r => r.json()).then(d => setResources(d.assets || []));
  }, [fetchBookings]);
  useFocusRefresh(fetchBookings);

  const handleBook = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'overlap' ? `Booking conflict! ${data.message}` : data.error || data.details?.end_time?.[0] || 'Booking failed';
        setError(msg);
        toast.error('Booking Failed', msg);
        return;
      }
      setShowDialog(false);
      setForm({ resource_id: '', start_time: '', end_time: '' });
      toast.success('Booking Confirmed', 'Your resource has been booked successfully.');
      fetchBookings();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelConfirm({ open: true, id });
  };

  return (
    <div className="min-h-screen">
      <Header title="Resource Bookings" />
      <div className="p-6 space-y-6 page-enter">
        <ConfirmDialog
          open={cancelConfirm.open}
          onOpenChange={(open) => setCancelConfirm(prev => ({ ...prev, open }))}
          title="Cancel Booking"
          description="Are you sure you want to cancel this booking? This action cannot be undone."
          confirmText="Yes, cancel"
          variant="destructive"
          onConfirm={async () => {
            await fetch(`/api/bookings/${cancelConfirm.id}/cancel`, { method: 'PATCH' });
            toast.info('Booking Cancelled');
            fetchBookings();
          }}
        />
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bookings</h2>
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Book Resource</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-20" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="Book a shared resource like a meeting room or projector."
            action={{ label: 'Book Resource', onClick: () => setShowDialog(true) }}
          />
        ) : (
          <>
            <div className="grid gap-3">
              {bookings.map((booking, i) => (
                <Card
                  key={booking.id}
                  className="hover:border-primary/30 transition-all duration-200 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.resource?.name} <span className="text-xs text-muted-foreground font-mono">({booking.resource?.assetTag})</span></p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(booking.startTime)} — {formatDateTime(booking.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">Booked by: {booking.booker?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(booking.status)} className="text-xs">{booking.status}</Badge>
                      {(booking.status === 'Upcoming' || booking.status === 'Ongoing') && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleCancel(booking.id)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Book Resource</DialogTitle></DialogHeader>
            {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><Label>Resource</Label>
                <Select value={form.resource_id} onValueChange={v => setForm({ ...form, resource_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                  <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.assetTag} — {r.name} ({r.location || 'No location'})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleBook} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Book</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
