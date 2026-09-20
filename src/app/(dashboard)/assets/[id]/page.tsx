'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DynamicFieldDisplay, type FieldSchema } from '@/components/ui/dynamic-fields';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/lib/auth-context';
import { getStatusVariant, formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { Package, History, Wrench, CalendarDays, MapPin, ArrowRightLeft, Loader2, QrCode, Download, Upload, Camera } from 'lucide-react';
import type { Asset } from '@/types';

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

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';

  useEffect(() => {
    fetch(`/api/assets/${params.id}`)
      .then(r => r.json())
      .then(d => { setAsset(d.asset); setLoading(false); });
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || []));
  }, [params.id]);

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
      </div>
    </div>
  );
}
