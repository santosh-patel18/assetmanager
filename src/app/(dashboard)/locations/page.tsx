'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast-notification';
import { LocationTreeSelect, locationTypeColors } from '@/components/ui/location-tree-select';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { useAuth } from '@/lib/auth-context';
import {
  MapPin, Plus, ChevronRight, Building2, Loader2,
  Pencil, MapPinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LOCATION_TYPES = ['HQ', 'Region', 'City', 'Building', 'Floor', 'Room', 'Zone'] as const;

interface LocationFlat {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { assets: number };
}

interface LocationTree extends LocationFlat {
  children: LocationTree[];
}

function buildTree(items: LocationFlat[], parentId: string | null = null): LocationTree[] {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDeactivate,
}: {
  node: LocationTree;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (loc: LocationFlat) => void;
  onDeactivate: (loc: LocationFlat) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const typeColor = locationTypeColors[node.type] || 'from-gray-500 to-gray-600';

  return (
    <>
      <tr className="border-t table-row-hover opacity-0 animate-fade-in">
        <td className="p-3" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.id)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="w-6" />
            )}
            <div className={`h-7 w-7 rounded-md bg-gradient-to-br ${typeColor} flex items-center justify-center text-white flex-shrink-0`}>
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-medium">{node.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{node.code}</p>
            </div>
          </div>
        </td>
        <td className="p-3">
          <Badge variant="outline" className="text-xs">{node.type}</Badge>
        </td>
        <td className="p-3 text-sm text-muted-foreground">{node._count?.assets || 0}</td>
        <td className="p-3">
          <Badge
            variant={node.status === 'Active' ? 'success' : 'secondary'}
            className="text-xs"
          >
            {node.status}
          </Badge>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {node.status === 'Active' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => onDeactivate(node)}>
                <MapPinOff className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      {hasChildren && isExpanded && node.children.map(child => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
        />
      ))}
    </>
  );
}

export default function LocationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [locations, setLocations] = useState<LocationFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationFlat | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<LocationFlat | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', code: '', type: '' as string, parent_id: null as string | null, address: '',
  });

  useEffect(() => { document.title = 'Locations | AssetFlow'; }, []);

  const fetchLocations = useCallback(() => {
    setLoading(true);
    fetch('/api/locations')
      .then(r => r.json())
      .then(d => { setLocations(d.locations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useFocusRefresh(fetchLocations);

  const tree = buildTree(locations);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(locations.map(l => l.id)));
  };

  const resetForm = () => {
    setForm({ name: '', code: '', type: '', parent_id: null, address: '' });
  };

  const handleCreate = async () => {
    setSubmitting(true);
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Location created', `${data.location.name} added successfully.`);
      setShowCreate(false);
      resetForm();
      fetchLocations();
      // Auto-expand parent
      if (form.parent_id) setExpanded(prev => { const next = new Set(Array.from(prev)); next.add(form.parent_id!); return next; });
    } else {
      toast.error('Error', data.error || 'Failed to create location');
    }
    setSubmitting(false);
  };

  const handleEdit = async () => {
    if (!editLocation) return;
    setSubmitting(true);
    const res = await fetch(`/api/locations/${editLocation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Location updated', `${data.location.name} updated.`);
      setEditLocation(null);
      resetForm();
      fetchLocations();
    } else {
      toast.error('Error', data.error || 'Failed to update location');
    }
    setSubmitting(false);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setSubmitting(true);
    const res = await fetch(`/api/locations/${deactivateTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Inactive' }),
    });
    if (res.ok) {
      toast.success('Deactivated', `${deactivateTarget.name} has been deactivated.`);
      fetchLocations();
    } else {
      const data = await res.json();
      toast.error('Error', data.error || 'Failed to deactivate');
    }
    setDeactivateTarget(null);
    setSubmitting(false);
  };

  const openEdit = (loc: LocationFlat) => {
    setForm({
      name: loc.name,
      code: loc.code,
      type: loc.type,
      parent_id: loc.parentId,
      address: loc.address || '',
    });
    setEditLocation(loc);
  };

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';

  const formDialog = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Office" />
        </div>
        <div>
          <Label>Code *</Label>
          <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAIN-OFFICE" className="font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type *</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Parent Location</Label>
          <LocationTreeSelect
            locations={locations.filter(l => !isEdit || l.id !== editLocation?.id)}
            value={form.parent_id}
            onChange={v => setForm({ ...form, parent_id: v })}
            placeholder="None (top-level)"
          />
        </div>
      </div>
      <div>
        <Label>Address</Label>
        <Textarea
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
          placeholder="Physical address (optional)"
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => { isEdit ? setEditLocation(null) : setShowCreate(false); resetForm(); }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleEdit : handleCreate}
          disabled={submitting || !form.name || !form.code || !form.type}
          className="gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {isEdit ? 'Save Changes' : 'Create Location'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header title="Locations" />
      <div className="p-6 space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Location Hierarchy</h2>
            <Badge variant="outline" className="text-xs">{locations.length} locations</Badge>
          </div>
          <div className="flex items-center gap-2">
            {locations.length > 0 && (
              <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            )}
            {isManager && (
              <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Add Location</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Create Location</DialogTitle></DialogHeader>
                  {formDialog(false)}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-14" />)}</div>
        ) : locations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No locations configured"
            description="Set up your organization's physical locations to track where assets are."
            action={isManager ? { label: 'Add First Location', onClick: () => setShowCreate(true) } : undefined}
          />
        ) : (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">All Locations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assets</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.map(node => (
                    <TreeRow
                      key={node.id}
                      node={node}
                      depth={0}
                      expanded={expanded}
                      onToggle={toggleExpand}
                      onEdit={openEdit}
                      onDeactivate={setDeactivateTarget}
                    />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editLocation} onOpenChange={(o) => { if (!o) { setEditLocation(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>
            {formDialog(true)}
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirm */}
        <ConfirmDialog
          open={!!deactivateTarget}
          onConfirm={handleDeactivate}
          onOpenChange={(o) => { if (!o) setDeactivateTarget(null); }}
          title="Deactivate Location?"
          description={`This will mark "${deactivateTarget?.name}" as inactive. Assets won't be affected.`}
          confirmText="Deactivate"
          variant="destructive"
        />
      </div>
    </div>
  );
}
