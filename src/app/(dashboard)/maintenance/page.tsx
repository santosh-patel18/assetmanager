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
import { Textarea } from '@/components/ui/textarea';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/components/ui/toast-notification';
import { getStatusVariant, formatDate } from '@/lib/utils';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { useAuth } from '@/lib/auth-context';
import { Wrench, Plus, Check, X, UserCheck, CheckCircle, Inbox, Loader2 } from 'lucide-react';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import type { MaintenanceRequest, Asset } from '@/types';

export default function MaintenancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showTechDialog, setShowTechDialog] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [techName, setTechName] = useState('');
  const [form, setForm] = useState({ asset_id: '', issue: '', priority: 'medium', photo_url: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; onConfirm: () => Promise<void> }>({ open: false, title: '', description: '', onConfirm: async () => {} });

  useEffect(() => {
    document.title = 'Maintenance | AssetFlow';
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (locationFilter) params.set('locationId', locationFilter);
    fetch(`/api/maintenance-requests?${params}`).then(r => r.json()).then(d => {
      setRequests(d.requests || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || Math.ceil((d.total || 0) / 20));
      setLoading(false);
    }).catch(() => setLoading(false));
    fetch('/api/assets?limit=200').then(r => r.json()).then(d => setAssets(d.assets || []));
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || []));
  }, [page, locationFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusRefresh(fetchData);

  const handleRaise = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/maintenance-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      toast.success('Request Submitted', 'Maintenance request has been raised successfully.');
      setShowDialog(false);
      setForm({ asset_id: '', issue: '', priority: 'medium', photo_url: '' });
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    if (action === 'reject') {
      setConfirmState({
        open: true,
        title: 'Reject Request',
        description: 'Are you sure you want to reject this maintenance request?',
        onConfirm: async () => {
          await fetch(`/api/maintenance-requests/${id}/${action}`, { method: 'PATCH' });
          toast.warning('Request Rejected', 'The maintenance request has been rejected.');
          fetchData();
        },
      });
      return;
    }
    await fetch(`/api/maintenance-requests/${id}/${action}`, { method: 'PATCH' });
    const actionLabel = action === 'approve' ? 'Approved' : action === 'resolve' ? 'Resolved' : action.charAt(0).toUpperCase() + action.slice(1);
    toast.success(`Request ${actionLabel}`, `Maintenance request has been ${actionLabel.toLowerCase()}.`);
    fetchData();
  };

  const handleAssignTech = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/maintenance-requests/${selectedId}/assign-technician`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician: techName }),
      });
      toast.success('Technician Assigned', `${techName} has been assigned.`);
      setShowTechDialog(false);
      setTechName('');
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';

  return (
    <div className="min-h-screen">
      <Header title="Maintenance Management" />
      <div className="p-6 space-y-6 page-enter">
        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
          title={confirmState.title}
          description={confirmState.description}
          confirmText="Yes, reject"
          variant="destructive"
          onConfirm={confirmState.onConfirm}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Maintenance Requests</h2>
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
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Raise Request</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-20" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No maintenance requests"
            description="All assets are in good shape. Raise a request if something needs attention."
            className="py-16"
          />
        ) : (
          <>
            <div className="space-y-3">
              {requests.map(req => (
                <Card key={req.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white ${req.priority === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600' : req.priority === 'medium' ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
                          <Wrench className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{req.asset?.assetTag} — {req.asset?.name}</p>
                          <p className="text-sm text-muted-foreground">{req.issue}</p>
                          <p className="text-xs text-muted-foreground mt-1">Raised by {req.raiser?.name} on {formatDate(req.createdAt)}{req.technician ? ` · Tech: ${req.technician}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.priority === 'high' ? 'destructive' : req.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs capitalize">{req.priority}</Badge>
                        <Badge variant={getStatusVariant(req.status)} className="text-xs">{req.status}</Badge>
                        {isManager && req.status === 'Pending' && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, 'approve')}><Check className="h-3 w-3" /> Approve</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => handleAction(req.id, 'reject')}><X className="h-3 w-3" /> Reject</Button>
                          </>
                        )}
                        {isManager && req.status === 'Approved' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedId(req.id); setShowTechDialog(true); }}><UserCheck className="h-3 w-3" /> Assign Tech</Button>
                        )}
                        {isManager && ['Approved', 'Technician Assigned', 'In Progress'].includes(req.status) && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, 'resolve')}><CheckCircle className="h-3 w-3" /> Resolve</Button>
                        )}
                      </div>
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

        {/* Raise Request Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Raise Maintenance Request</DialogTitle></DialogHeader>
            {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><Label>Asset</Label><Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetTag} — {a.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Issue Description</Label><Textarea value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="Describe the issue..." /></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={handleRaise} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Submit</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Technician Dialog */}
        <Dialog open={showTechDialog} onOpenChange={setShowTechDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Technician</DialogTitle></DialogHeader>
            <div><Label>Technician Name</Label><Input value={techName} onChange={e => setTechName(e.target.value)} placeholder="Enter technician name" /></div>
            <DialogFooter><Button onClick={handleAssignTech} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
