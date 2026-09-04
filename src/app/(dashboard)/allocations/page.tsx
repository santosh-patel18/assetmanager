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
import { ArrowLeftRight, RotateCcw, Send, Plus, Inbox, Loader2 } from 'lucide-react';
import type { Allocation, Asset, Employee, Department } from '@/types';

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [allocForm, setAllocForm] = useState({ asset_id: '', target_type: 'employee', target_id: '', expected_return_date: '' });
  const [returnNotes, setReturnNotes] = useState('');
  const [transferForm, setTransferForm] = useState({ new_target_type: 'employee', new_target_id: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Allocations | AssetFlow';
  }, []);

  const fetchAllocations = useCallback(() => {
    setLoading(true);
    fetch(`/api/allocations?status=Active&page=${page}&limit=20`)
      .then(r => r.json())
      .then(d => {
        setAllocations(d.allocations || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  const fetchFormData = () => {
    fetch('/api/assets?status=Available&limit=100').then(r => r.json()).then(d => setAssets(d.assets || []));
    fetch('/api/org/employees').then(r => r.json()).then(d => setEmployees((d.employees || []).filter((e: Employee) => e.status === 'Active')));
    fetch('/api/org/departments').then(r => r.json()).then(d => setDepartments(d.departments || []));
  };

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);
  useEffect(() => { fetchFormData(); }, []);
  useFocusRefresh(fetchAllocations);

  const handleAllocate = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${allocForm.asset_id}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'already_allocated' ? `Already allocated to ${data.current_holder}. Use Transfer Request.` : data.error);
        return;
      }
      toast.success('Asset Allocated', `Asset has been allocated successfully.`);
      setShowAllocateDialog(false);
      setAllocForm({ asset_id: '', target_type: 'employee', target_id: '', expected_return_date: '' });
      fetchAllocations();
      fetchFormData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedAllocation) return;
    setSubmitting(true);
    try {
      await fetch(`/api/allocations/${selectedAllocation.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition_notes: returnNotes }),
      });
      toast.success('Asset Returned', 'The asset has been returned successfully.');
      setShowReturnDialog(false);
      setReturnNotes('');
      fetchAllocations();
      fetchFormData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAllocation) return;
    setSubmitting(true);
    try {
      await fetch(`/api/allocations/${selectedAllocation.id}/transfer-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm),
      });
      toast.success('Transfer Requested', 'Transfer request has been submitted for approval.');
      setShowTransferDialog(false);
      setTransferForm({ new_target_type: 'employee', new_target_id: '' });
      fetchAllocations();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Asset Allocation & Transfer" />
      <div className="p-6 space-y-6 page-enter">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Active Allocations</h2>
          <Button onClick={() => setShowAllocateDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Allocate Asset</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-16" />
            ))}
          </div>
        ) : allocations.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No active allocations"
            description="Allocate assets to employees or departments to see them here."
            className="py-16"
          />
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full"><thead className="bg-muted/50"><tr>
                <th className="text-left p-3 text-sm font-medium">Asset</th>
                <th className="text-left p-3 text-sm font-medium">Assigned To</th>
                <th className="text-left p-3 text-sm font-medium">Expected Return</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr></thead><tbody>
                {allocations.map(alloc => {
                  const isOverdue = alloc.expectedReturnDate && new Date(alloc.expectedReturnDate) < new Date();
                  return (
                    <tr key={alloc.id} className={`border-t ${isOverdue ? 'bg-red-500/5' : ''} hover:bg-muted/30 transition-colors`}>
                      <td className="p-3 text-sm"><span className="font-mono text-primary">{alloc.asset?.assetTag}</span> {alloc.asset?.name}</td>
                      <td className="p-3 text-sm">
                        <span className="capitalize text-muted-foreground text-xs">{alloc.targetType}: </span>
                        <span className="font-medium">{alloc.targetName || alloc.targetId.slice(0, 8) + '...'}</span>
                      </td>
                      <td className="p-3 text-sm">{alloc.expectedReturnDate ? <span className={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDate(alloc.expectedReturnDate)}{isOverdue ? ' ⚠️ OVERDUE' : ''}</span> : '—'}</td>
                      <td className="p-3"><Badge variant={getStatusVariant(alloc.status)} className="text-xs">{alloc.status}</Badge></td>
                      <td className="p-3 flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedAllocation(alloc); setShowReturnConfirm(true); }}><RotateCcw className="h-3 w-3" /> Return</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedAllocation(alloc); setShowTransferDialog(true); }}><Send className="h-3 w-3" /> Transfer</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}

        {/* Return Confirmation Dialog */}
        <ConfirmDialog
          open={showReturnConfirm}
          onOpenChange={setShowReturnConfirm}
          title="Return Asset"
          description={`Are you sure you want to return ${selectedAllocation?.asset?.name || 'this asset'}? You can add condition notes in the next step.`}
          confirmText="Continue"
          onConfirm={() => {
            setShowReturnConfirm(false);
            setShowReturnDialog(true);
          }}
        />

        {/* Allocate Dialog */}
        <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Allocate Asset</DialogTitle></DialogHeader>
            {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><Label>Asset</Label><Select value={allocForm.asset_id} onValueChange={v => setAllocForm({ ...allocForm, asset_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetTag} — {a.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Type</Label><Select value={allocForm.target_type} onValueChange={v => setAllocForm({ ...allocForm, target_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="department">Department</SelectItem></SelectContent></Select></div>
              <div><Label>Target</Label><Select value={allocForm.target_id} onValueChange={v => setAllocForm({ ...allocForm, target_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{allocForm.target_type === 'employee' ? employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>) : departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Expected Return Date</Label><Input type="date" value={allocForm.expected_return_date} onChange={e => setAllocForm({ ...allocForm, expected_return_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleAllocate} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Allocate</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Dialog */}
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Return Asset</DialogTitle></DialogHeader>
            <div><Label>Condition Notes</Label><Textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Describe asset condition..." /></div>
            <DialogFooter><Button onClick={handleReturn} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Confirm Return</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Transfer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>New Target Type</Label><Select value={transferForm.new_target_type} onValueChange={v => setTransferForm({ ...transferForm, new_target_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="department">Department</SelectItem></SelectContent></Select></div>
              <div><Label>New Target</Label><Select value={transferForm.new_target_id} onValueChange={v => setTransferForm({ ...transferForm, new_target_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{transferForm.new_target_type === 'employee' ? employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>) : departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={handleTransfer} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Submit Request</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
