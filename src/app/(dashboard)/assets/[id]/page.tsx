'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DynamicFieldDisplay, type FieldSchema } from '@/components/ui/dynamic-fields';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/lib/auth-context';
import { getStatusVariant, formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import {
  Package, History, Wrench, CalendarDays, MapPin, ArrowRightLeft, Loader2,
  QrCode, Download, Camera,
  IndianRupee, TrendingDown, Shield, Calculator, FileText, Truck, Clock,
  ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import type { Asset } from '@/types';

// ─── Financial types ─────────────────────────────────────────────

interface AssetFinancials {
  asset: { id: string; name: string; assetTag: string; category?: string; department?: string; location?: string };
  financials: {
    acquisitionDate: string | null;
    acquisitionCost: number | null;
    purchaseOrderNumber: string | null;
    invoiceNumber: string | null;
    supplier: string | null;
    warrantyEndDate: string | null;
  };
  depreciation: {
    method: string | null;
    usefulLifeMonths: number | null;
    salvageValue: number | null;
    bookValue?: number;
    totalDepreciation?: number;
    percentDepreciated?: number;
    monthsElapsed?: number;
  };
  depreciationSchedule: {
    year: number;
    month: number;
    openingValue: number;
    depreciationAmt: number;
    closingValue: number;
    method: string;
  }[];
  insurancePolicies: {
    id: string;
    policyNumber: string;
    provider: string;
    coverageAmount: number;
    premium: number | null;
    startDate: string;
    endDate: string;
    status: string;
  }[];
}

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight-Line',
  declining_balance: 'Declining Balance',
  sum_of_years: 'Sum-of-Years',
};

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Component ───────────────────────────────────────────────────

export default function AssetDetailPage() {
  const params = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferLocationId, setTransferLocationId] = useState<string | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Financial state
  const [financials, setFinancials] = useState<AssetFinancials | null>(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showEditFinancials, setShowEditFinancials] = useState(false);
  const [savingFinancials, setSavingFinancials] = useState(false);
  const [calculatingDep, setCalculatingDep] = useState(false);
  const [editForm, setEditForm] = useState({
    purchaseOrderNumber: '',
    invoiceNumber: '',
    supplier: '',
    depreciationMethod: '',
    usefulLifeMonths: '',
    salvageValue: '',
    warrantyEndDate: '',
  });

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';
  const isFinancialEditor = user && ['admin', 'finance_manager', 'asset_manager'].includes(user.role);
  const canViewFinancials = user && ['admin', 'finance_manager', 'asset_manager', 'department_head'].includes(user.role);

  useEffect(() => {
    fetch(`/api/assets/${params.id}`)
      .then(r => r.json())
      .then(d => { setAsset(d.asset); setLoading(false); });
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || []));
  }, [params.id]);

  // ─── Fetch Financials ────────────────────────────────────────────

  const fetchFinancials = useCallback(async () => {
    if (!canViewFinancials) return;
    setFinancialsLoading(true);
    try {
      const res = await fetch(`/api/assets/${params.id}/financials`);
      if (res.ok) {
        const data = await res.json();
        setFinancials(data.data || data);
      }
    } catch { /* swallow */ }
    setFinancialsLoading(false);
  }, [params.id, canViewFinancials]);

  useEffect(() => {
    if (asset && canViewFinancials) {
      fetchFinancials();
    }
  }, [asset, canViewFinancials, fetchFinancials]);

  // ─── Open Edit Dialog ────────────────────────────────────────────

  const openEditFinancials = () => {
    if (!financials) return;
    const f = financials.financials;
    const d = financials.depreciation;
    setEditForm({
      purchaseOrderNumber: f.purchaseOrderNumber || '',
      invoiceNumber: f.invoiceNumber || '',
      supplier: f.supplier || '',
      depreciationMethod: d.method || '',
      usefulLifeMonths: d.usefulLifeMonths?.toString() || '',
      salvageValue: d.salvageValue?.toString() || '',
      warrantyEndDate: f.warrantyEndDate ? new Date(f.warrantyEndDate).toISOString().split('T')[0] : '',
    });
    setShowEditFinancials(true);
  };

  // ─── Save Financial Fields ───────────────────────────────────────

  const saveFinancials = async () => {
    setSavingFinancials(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.purchaseOrderNumber !== (financials?.financials.purchaseOrderNumber || '')) {
        body.purchaseOrderNumber = editForm.purchaseOrderNumber || null;
      }
      if (editForm.invoiceNumber !== (financials?.financials.invoiceNumber || '')) {
        body.invoiceNumber = editForm.invoiceNumber || null;
      }
      if (editForm.supplier !== (financials?.financials.supplier || '')) {
        body.supplier = editForm.supplier || null;
      }
      if (editForm.depreciationMethod !== (financials?.depreciation.method || '')) {
        body.depreciationMethod = editForm.depreciationMethod || null;
      }
      if (editForm.usefulLifeMonths !== (financials?.depreciation.usefulLifeMonths?.toString() || '')) {
        body.usefulLifeMonths = editForm.usefulLifeMonths ? parseInt(editForm.usefulLifeMonths) : null;
      }
      if (editForm.salvageValue !== (financials?.depreciation.salvageValue?.toString() || '')) {
        body.salvageValue = editForm.salvageValue ? parseFloat(editForm.salvageValue) : null;
      }
      const newWarranty = editForm.warrantyEndDate || null;
      const oldWarranty = financials?.financials.warrantyEndDate
        ? new Date(financials.financials.warrantyEndDate).toISOString().split('T')[0]
        : null;
      if (newWarranty !== oldWarranty) {
        body.warrantyEndDate = newWarranty;
      }

      if (Object.keys(body).length === 0) {
        toast.info('No Changes', 'No fields were modified.');
        setShowEditFinancials(false);
        setSavingFinancials(false);
        return;
      }

      const res = await fetch(`/api/assets/${params.id}/financials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Financials Updated', 'Asset financial data has been saved.');
        setShowEditFinancials(false);
        fetchFinancials();
      } else {
        const data = await res.json();
        toast.error('Update Failed', data.error || 'Failed to update financial data.');
      }
    } finally {
      setSavingFinancials(false);
    }
  };

  // ─── Calculate Depreciation ──────────────────────────────────────

  const calculateDepreciation = async () => {
    setCalculatingDep(true);
    try {
      const res = await fetch(`/api/assets/${params.id}/depreciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Depreciation Calculated', data.data?.message || 'Schedule generated successfully.');
        fetchFinancials();
        setShowSchedule(true);
      } else {
        toast.error('Calculation Failed', data.error || 'Failed to calculate depreciation.');
      }
    } finally {
      setCalculatingDep(false);
    }
  };

  // ─── Transfer + Photo handlers (unchanged) ──────────────────────

  const handleTransferLocation = async () => {
    if (!transferLocationId) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/assets/${params.id}/transfer-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newLocationId: transferLocationId, reason: transferReason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Location Transferred', data.message);
        setAsset(data.asset);
        setShowTransferDialog(false);
        setTransferLocationId(null);
        setTransferReason('');
      } else {
        toast.error('Transfer Failed', data.error || 'Failed to transfer');
      }
    } finally {
      setTransferring(false);
    }
  };

  if (loading) return <div className="min-h-screen"><Header title="Asset Detail" /><div className="p-6"><p className="text-muted-foreground">Loading...</p></div></div>;
  if (!asset) return <div className="min-h-screen"><Header title="Asset Detail" /><div className="p-6"><p>Asset not found</p></div></div>;

  const fieldSchema = (asset.category?.fieldSchema || {}) as FieldSchema;
  const attributes = (asset.attributes || {}) as Record<string, unknown>;
  const hasCustomFields = Object.keys(fieldSchema).length > 0;
  const locationDisplay = asset.locationRef?.name || asset.location || '—';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/assets/${params.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Photo Uploaded', 'Asset photo has been updated.');
        setAsset({ ...asset, photoUrl: data.photoUrl });
      } else {
        toast.error('Upload Failed', data.error || 'Failed to upload photo');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const downloadQR = async (format: 'png' | 'svg') => {
    const res = await fetch(`/api/assets/${asset.id}/qr?format=${format}&size=400`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.assetTag}-qr.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Warranty helper ─────────────────────────────────────────────

  const warrantyStatus = () => {
    if (!financials?.financials.warrantyEndDate) return null;
    const days = Math.ceil((new Date(financials.financials.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const, days };
    if (days <= 30) return { label: `${days}d left`, variant: 'warning' as const, days };
    if (days <= 90) return { label: `${days}d left`, variant: 'warning' as const, days };
    return { label: `${days}d left`, variant: 'success' as const, days };
  };

  const warranty = warrantyStatus();

  return (
    <div className="min-h-screen">
      <Header title={`${asset.assetTag} — ${asset.name}`} />
      <div className="p-6 space-y-6 page-enter">
        {/* Asset Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {asset.photoUrl ? (
                    <img src={asset.photoUrl} alt={asset.name} className="h-12 w-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white"><Package className="h-6 w-6" /></div>
                  )}
                  <div>
                    <CardTitle>{asset.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{asset.assetTag}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isManager && (
                    <label className="cursor-pointer">
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild disabled={uploadingPhoto}>
                        <span>{uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />} Photo</span>
                      </Button>
                    </label>
                  )}
                  <Badge variant={getStatusVariant(asset.status)} className="text-sm px-3 py-1">{asset.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Category</span><p className="font-medium">{asset.category?.name}</p></div>
                <div><span className="text-muted-foreground">Serial Number</span><p className="font-medium font-mono">{asset.serialNumber || '—'}</p></div>
                <div>
                  <span className="text-muted-foreground">Location</span>
                  <div className="flex items-center gap-2">
                    <p className="font-medium flex items-center gap-1.5">
                      {asset.locationRef && <MapPin className="h-3.5 w-3.5 text-primary" />}
                      {locationDisplay}
                    </p>
                    {isManager && locations.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary"
                        onClick={() => setShowTransferDialog(true)}
                      >
                        <ArrowRightLeft className="h-3 w-3" /> Transfer
                      </Button>
                    )}
                  </div>
                </div>
                <div><span className="text-muted-foreground">Department</span><p className="font-medium">{asset.department?.name || '—'}</p></div>
                <div><span className="text-muted-foreground">Condition</span><p className="font-medium">{asset.condition || '—'}</p></div>
                <div><span className="text-muted-foreground">Acquisition Date</span><p className="font-medium">{formatDate(asset.acquisitionDate)}</p></div>
                <div><span className="text-muted-foreground">Cost</span><p className="font-medium">{formatCurrency(Number(asset.acquisitionCost))}</p></div>
                <div><span className="text-muted-foreground">Bookable</span><p className="font-medium">{asset.isBookable ? 'Yes' : 'No'}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: QR Code + Custom Fields */}
          <div className="space-y-6">
            {/* QR Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/assets/${asset.id}/qr?format=png&size=200`}
                  alt={`QR Code for ${asset.assetTag}`}
                  className="h-40 w-40 rounded-lg bg-white p-2"
                />
                <p className="text-xs text-muted-foreground text-center">Scan to view asset details</p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" onClick={() => downloadQR('png')} className="flex-1 gap-1 text-xs">
                    <Download className="h-3 w-3" /> PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadQR('svg')} className="flex-1 gap-1 text-xs">
                    <Download className="h-3 w-3" /> SVG
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Fields Card */}
            <Card>
              <CardHeader><CardTitle className="text-base">{hasCustomFields ? `${asset.category?.name} Fields` : 'Attributes'}</CardTitle></CardHeader>
              <CardContent>
                {hasCustomFields ? (
                  <DynamicFieldDisplay fieldSchema={fieldSchema} values={attributes} />
                ) : Object.keys(attributes).length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {Object.entries(attributes).map(([k, v]) => (
                      <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{String(v)}</span></div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No attributes</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* History Tabs */}
        <Tabs defaultValue="allocations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocations" className="gap-2"><History className="h-4 w-4" /> Allocations</TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /> Maintenance</TabsTrigger>
            <TabsTrigger value="state" className="gap-2"><Package className="h-4 w-4" /> State Log</TabsTrigger>
            {asset.isBookable && <TabsTrigger value="bookings" className="gap-2"><CalendarDays className="h-4 w-4" /> Bookings</TabsTrigger>}
            {canViewFinancials && <TabsTrigger value="financials" className="gap-2"><IndianRupee className="h-4 w-4" /> Financials</TabsTrigger>}
          </TabsList>

          <TabsContent value="allocations">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">Target</th><th className="text-left p-3 text-sm">By</th><th className="text-left p-3 text-sm">Date</th><th className="text-left p-3 text-sm">Status</th>
                </tr></thead><tbody>
                  {asset.allocations?.map((a) => (
                    <tr key={a.id} className="border-t"><td className="p-3 text-sm">{a.targetType}: {a.targetName || a.targetId}</td><td className="p-3 text-sm">{a.allocator?.name}</td><td className="p-3 text-sm">{formatDate(a.createdAt)}</td><td className="p-3"><Badge variant={getStatusVariant(a.status)} className="text-xs">{a.status}</Badge></td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">Issue</th><th className="text-left p-3 text-sm">Priority</th><th className="text-left p-3 text-sm">Raised By</th><th className="text-left p-3 text-sm">Status</th><th className="text-left p-3 text-sm">Date</th>
                </tr></thead><tbody>
                  {asset.maintenanceRequests?.map((m) => (
                    <tr key={m.id} className="border-t"><td className="p-3 text-sm">{m.issue}</td><td className="p-3"><Badge variant={m.priority === 'high' ? 'destructive' : m.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs">{m.priority}</Badge></td><td className="p-3 text-sm">{m.raiser?.name}</td><td className="p-3"><Badge variant={getStatusVariant(m.status)} className="text-xs">{m.status}</Badge></td><td className="p-3 text-sm">{formatDate(m.createdAt)}</td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="state">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">From</th><th className="text-left p-3 text-sm">To</th><th className="text-left p-3 text-sm">By</th><th className="text-left p-3 text-sm">When</th>
                </tr></thead><tbody>
                  {asset.stateLog?.map((s) => (
                    <tr key={s.id} className="border-t"><td className="p-3 text-sm">{s.fromStatus || '—'}</td><td className="p-3"><Badge variant={getStatusVariant(s.toStatus)} className="text-xs">{s.toStatus}</Badge></td><td className="p-3 text-sm">{s.changer?.name}</td><td className="p-3 text-sm">{formatDateTime(s.changedAt)}</td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          {asset.isBookable && (
            <TabsContent value="bookings">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full"><thead className="bg-muted/50"><tr>
                    <th className="text-left p-3 text-sm">Booked By</th><th className="text-left p-3 text-sm">Start</th><th className="text-left p-3 text-sm">End</th><th className="text-left p-3 text-sm">Status</th>
                  </tr></thead><tbody>
                    {asset.bookings?.map((b) => (
                      <tr key={b.id} className="border-t"><td className="p-3 text-sm">{b.booker?.name}</td><td className="p-3 text-sm">{formatDateTime(b.startTime)}</td><td className="p-3 text-sm">{formatDateTime(b.endTime)}</td><td className="p-3"><Badge variant={getStatusVariant(b.status)} className="text-xs">{b.status}</Badge></td></tr>
                    ))}
                  </tbody></table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ─── FINANCIALS TAB ─────────────────────────────────────────── */}
          {canViewFinancials && (
            <TabsContent value="financials" className="space-y-6">
              {financialsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !financials ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No financial data available for this asset.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Actions Bar */}
                  {isFinancialEditor && (
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={openEditFinancials} className="gap-2">
                        <FileText className="h-4 w-4" /> Edit Financials
                      </Button>
                      <Button
                        size="sm"
                        onClick={calculateDepreciation}
                        disabled={calculatingDep || !financials.depreciation.method}
                        className="gap-2"
                        title={!financials.depreciation.method ? 'Set a depreciation method first' : 'Recalculate depreciation schedule'}
                      >
                        {calculatingDep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                        Calculate Depreciation
                      </Button>
                    </div>
                  )}

                  {/* Procurement + Depreciation Overview Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Procurement Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Truck className="h-4 w-4 text-indigo-500" /> Procurement Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Acquisition Cost</span>
                            <p className="font-medium font-mono text-lg">{financials.financials.acquisitionCost != null ? formatCurrency(financials.financials.acquisitionCost) : '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Acquisition Date</span>
                            <p className="font-medium">{formatDate(financials.financials.acquisitionDate)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PO Number</span>
                            <p className="font-medium font-mono">{financials.financials.purchaseOrderNumber || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Invoice Number</span>
                            <p className="font-medium font-mono">{financials.financials.invoiceNumber || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Supplier</span>
                            <p className="font-medium">{financials.financials.supplier || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Warranty
                            </span>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{formatDate(financials.financials.warrantyEndDate)}</p>
                              {warranty && (
                                <Badge variant={warranty.variant} className="text-xs">
                                  {warranty.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Depreciation Overview Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-violet-500" /> Depreciation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {financials.depreciation.method ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Method</span>
                                <p className="font-medium">
                                  <Badge variant="secondary" className="text-xs">
                                    {METHOD_LABELS[financials.depreciation.method] || financials.depreciation.method}
                                  </Badge>
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Useful Life</span>
                                <p className="font-medium">{financials.depreciation.usefulLifeMonths} months ({((financials.depreciation.usefulLifeMonths || 0) / 12).toFixed(1)} yrs)</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Book Value</span>
                                <p className="font-medium font-mono text-lg text-violet-400">
                                  {financials.depreciation.bookValue != null ? formatCurrency(financials.depreciation.bookValue) : '—'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Salvage Value</span>
                                <p className="font-medium font-mono">{financials.depreciation.salvageValue != null ? formatCurrency(financials.depreciation.salvageValue) : '—'}</p>
                              </div>
                            </div>

                            {/* Depreciation Progress Bar */}
                            {financials.depreciation.percentDepreciated != null && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {financials.depreciation.monthsElapsed} / {financials.depreciation.usefulLifeMonths} months elapsed
                                  </span>
                                  <span className="font-mono font-medium">
                                    {financials.depreciation.percentDepreciated.toFixed(1)}% depreciated
                                  </span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(financials.depreciation.percentDepreciated, 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Total Depreciation: {formatCurrency(financials.depreciation.totalDepreciation || 0)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Calculator className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No depreciation method configured.</p>
                            {isFinancialEditor && (
                              <Button variant="link" size="sm" onClick={openEditFinancials} className="mt-1">
                                Configure now →
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Depreciation Schedule Table */}
                  {financials.depreciationSchedule.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calculator className="h-4 w-4" /> Depreciation Schedule
                            <Badge variant="secondary" className="text-xs ml-1">
                              {financials.depreciationSchedule.length} entries
                            </Badge>
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="gap-1 text-xs"
                          >
                            {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {showSchedule ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                      </CardHeader>
                      {showSchedule && (
                        <CardContent className="p-0">
                          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left p-3 font-medium">Period</th>
                                  <th className="text-right p-3 font-medium">Opening Value</th>
                                  <th className="text-right p-3 font-medium">Depreciation</th>
                                  <th className="text-right p-3 font-medium">Closing Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {financials.depreciationSchedule.map((entry, i) => (
                                  <tr
                                    key={`${entry.year}-${entry.month}`}
                                    className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${
                                      i % 12 === 0 && i > 0 ? 'border-t-2 border-t-border' : ''
                                    }`}
                                  >
                                    <td className="p-3 font-mono text-xs">
                                      {MONTH_NAMES[entry.month]} {entry.year}
                                    </td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(entry.openingValue)}</td>
                                    <td className="p-3 text-right font-mono text-amber-400">−{formatCurrency(entry.depreciationAmt)}</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(entry.closingValue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Insurance Policies */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-500" /> Insurance Policies
                        {financials.insurancePolicies.length > 0 && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            {financials.insurancePolicies.length}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {financials.insurancePolicies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shield className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No insurance policies for this asset.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left p-3 font-medium">Policy #</th>
                                <th className="text-left p-3 font-medium">Provider</th>
                                <th className="text-right p-3 font-medium">Coverage</th>
                                <th className="text-right p-3 font-medium">Premium</th>
                                <th className="text-left p-3 font-medium">Period</th>
                                <th className="text-left p-3 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {financials.insurancePolicies.map((p) => {
                                const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                  <tr key={p.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                                    <td className="p-3 font-mono text-xs">{p.policyNumber}</td>
                                    <td className="p-3">{p.provider}</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(p.coverageAmount)}</td>
                                    <td className="p-3 text-right font-mono">{p.premium ? formatCurrency(p.premium) : '—'}</td>
                                    <td className="p-3 text-xs">
                                      {formatDate(p.startDate)} → {formatDate(p.endDate)}
                                      {p.status === 'Active' && daysLeft > 0 && daysLeft <= 30 && (
                                        <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{daysLeft}d left</Badge>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant={
                                        p.status === 'Active' ? 'success' :
                                        p.status === 'Expired' ? 'destructive' : 'secondary'
                                      }>
                                        {p.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Transfer Location Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Asset Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Current Location: </span>
                <strong>{locationDisplay}</strong>
              </div>
              <div>
                <Label>New Location *</Label>
                <LocationTreeSelect
                  locations={locations}
                  value={transferLocationId}
                  onChange={setTransferLocationId}
                  placeholder="Select destination"
                />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Why is this asset being transferred?"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
              <Button
                onClick={handleTransferLocation}
                disabled={!transferLocationId || transferring}
                className="gap-2"
              >
                {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Financials Dialog */}
        <Dialog open={showEditFinancials} onOpenChange={setShowEditFinancials}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Financial Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PO Number</Label>
                  <Input
                    value={editForm.purchaseOrderNumber}
                    onChange={e => setEditForm({ ...editForm, purchaseOrderNumber: e.target.value })}
                    placeholder="PO-2024-001"
                  />
                </div>
                <div>
                  <Label>Invoice Number</Label>
                  <Input
                    value={editForm.invoiceNumber}
                    onChange={e => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    placeholder="INV-001"
                  />
                </div>
              </div>
              <div>
                <Label>Supplier</Label>
                <Input
                  value={editForm.supplier}
                  onChange={e => setEditForm({ ...editForm, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Depreciation Settings</h4>
                <div>
                  <Label>Method</Label>
                  <Select
                    value={editForm.depreciationMethod}
                    onValueChange={v => setEditForm({ ...editForm, depreciationMethod: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="straight_line">Straight-Line</SelectItem>
                      <SelectItem value="declining_balance">Declining Balance</SelectItem>
                      <SelectItem value="sum_of_years">Sum-of-Years-Digits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Useful Life (months)</Label>
                    <Input
                      type="number"
                      value={editForm.usefulLifeMonths}
                      onChange={e => setEditForm({ ...editForm, usefulLifeMonths: e.target.value })}
                      placeholder="60"
                      min={1}
                      max={600}
                    />
                  </div>
                  <div>
                    <Label>Salvage Value</Label>
                    <Input
                      type="number"
                      value={editForm.salvageValue}
                      onChange={e => setEditForm({ ...editForm, salvageValue: e.target.value })}
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <Label>Warranty End Date</Label>
                <Input
                  type="date"
                  value={editForm.warrantyEndDate}
                  onChange={e => setEditForm({ ...editForm, warrantyEndDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditFinancials(false)}>Cancel</Button>
              <Button onClick={saveFinancials} disabled={savingFinancials} className="gap-2">
                {savingFinancials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
