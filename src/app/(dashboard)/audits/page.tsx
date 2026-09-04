'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/components/ui/toast-notification';
import { getStatusVariant, formatDate } from '@/lib/utils';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { ClipboardCheck, Plus, Eye, Inbox, Loader2 } from 'lucide-react';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import type { AuditCycle, Department, Employee } from '@/types';

export default function AuditsPage() {
  const toast = useToast();
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ scope_department_id: '', scope_location: '', start_date: '', end_date: '', auditor_ids: [] as string[] });

  useEffect(() => {
    document.title = 'Audits | AssetFlow';
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (locationFilter) params.set('locationId', locationFilter);
    fetch(`/api/audit-cycles?${params}`).then(r => r.json()).then(d => {
      setCycles(d.cycles || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || Math.ceil((d.total || 0) / 20));
      setLoading(false);
    }).catch(() => setLoading(false));
    fetch('/api/org/departments').then(r => r.json()).then(d => setDepartments(d.departments || []));
    fetch('/api/org/employees').then(r => r.json()).then(d => setEmployees((d.employees || []).filter((e: Employee) => e.status === 'Active')));
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || []));
  }, [page, locationFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusRefresh(fetchData);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/audit-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Audit Cycle Created', 'A new audit cycle has been created.');
      setShowDialog(false);
      setForm({ scope_department_id: '', scope_location: '', start_date: '', end_date: '', auditor_ids: [] });
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Asset Audit" />
      <div className="p-6 space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Audit Cycles</h2>
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
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Cycle</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-20" />
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No audit cycles"
            description="Create an audit cycle to start tracking asset verification."
            className="py-16"
          />
        ) : (
          <>
            <div className="grid gap-4">
              {cycles.map(cycle => (
                <Card key={cycle.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white"><ClipboardCheck className="h-5 w-5" /></div>
                      <div>
                        <p className="font-medium">Audit Cycle — {cycle.scopeDepartment?.name || cycle.scopeLocation || 'All'}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</p>
                        <p className="text-xs text-muted-foreground">Created by {cycle.creator?.name} · {cycle._count?.items || 0} items · {cycle.auditors?.length || 0} auditors</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(cycle.status)} className="text-xs">{cycle.status}</Badge>
                      <Link href={`/audits/${cycle.id}`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1"><Eye className="h-3 w-3" /> View</Button>
                      </Link>
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
            <DialogHeader><DialogTitle>Create Audit Cycle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Scope Department</Label><Select value={form.scope_department_id} onValueChange={v => setForm({ ...form, scope_department_id: v })}><SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div>
                <Label>Scope Location</Label>
                <LocationTreeSelect
                  locations={locations}
                  value={form.scope_location || null}
                  onChange={v => setForm({ ...form, scope_location: v || '' })}
                  placeholder="All locations"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Auditors</Label>
                <Select onValueChange={v => { if (!form.auditor_ids.includes(v)) setForm({ ...form, auditor_ids: [...form.auditor_ids, v] }); }}>
                  <SelectTrigger><SelectValue placeholder="Add auditors" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">{form.auditor_ids.map(id => { const e = employees.find(emp => emp.id === id); return <Badge key={id} variant="secondary" className="text-xs">{e?.name || id}</Badge>; })}</div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={submitting} className="gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
