'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/lib/auth-context';
import { getStatusVariant } from '@/lib/utils';
import { ScanLine, Camera, CameraOff, Keyboard, ArrowRight, Package, CheckCircle, RotateCcw, Loader2 } from 'lucide-react';

interface ScannedAsset {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  category?: { name: string };
  locationRef?: { name: string } | null;
  location?: string | null;
  allocations?: { id: string; targetId: string; status: string }[];
}

export default function ScannerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualTag, setManualTag] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    document.title = 'QR Scanner | AssetFlow';
  }, []);

  const handleScanResult = useCallback(async (decodedText: string) => {
    // Extract asset tag from URL or use as-is
    let assetTag = decodedText;
    try {
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      const scanIndex = pathParts.indexOf('scan');
      if (scanIndex !== -1 && pathParts[scanIndex + 1]) {
        assetTag = pathParts[scanIndex + 1];
      }
    } catch {
      // Not a URL — use as-is (might be just an asset tag)
    }

    // Fetch asset details
    try {
      const res = await fetch(`/api/assets?search=${encodeURIComponent(assetTag)}&limit=1`);
      const data = await res.json();
      const asset = data.assets?.[0];

      if (asset) {
        setScannedAsset(asset);
        // Stop camera
        if (html5QrCodeRef.current) {
          try {
            await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
          } catch { /* ignore */ }
          setScanning(false);
        }
      } else {
        toast.error('Asset Not Found', `No asset found for tag: ${assetTag}`);
      }
    } catch {
      toast.error('Scan Error', 'Failed to look up the scanned code');
    }
  }, [toast]);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    setCameraError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => handleScanResult(text),
        () => {} // ignore errors during scanning
      );
      setScanning(true);
    } catch (err) {
      setCameraError(
        err instanceof Error && err.message.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not access camera. Try using manual entry instead.'
      );
    }
  }, [handleScanResult]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await (html5QrCodeRef.current as { stop: () => Promise<void> }).stop();
      } catch { /* ignore */ }
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleManualSubmit = () => {
    if (manualTag.trim()) {
      handleScanResult(manualTag.trim());
    }
  };

  const handleQuickCheckin = async () => {
    if (!scannedAsset) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/assets/${scannedAsset.id}/quick-checkin`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Checked In!', data.message);
        setScannedAsset({ ...scannedAsset, status: 'Allocated' });
      } else {
        toast.error('Check-in Failed', data.error);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickCheckout = async () => {
    if (!scannedAsset) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/assets/${scannedAsset.id}/quick-checkout`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Returned!', data.message);
        setScannedAsset({ ...scannedAsset, status: 'Available' });
      } else {
        toast.error('Check-out Failed', data.error);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const resetScan = () => {
    setScannedAsset(null);
    setManualTag('');
  };

  // Check if current user has an active allocation for this asset
  const hasMyAllocation = scannedAsset?.allocations?.some(
    a => a.targetId === user?.id && a.status === 'Active'
  );

  return (
    <div className="min-h-screen">
      <Header title="QR Scanner" />
      <div className="p-6 space-y-6 page-enter">
        {/* Scanned Asset Result */}
        {scannedAsset ? (
          <div className="max-w-md mx-auto space-y-4">
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{scannedAsset.name}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{scannedAsset.assetTag}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(scannedAsset.status)} className="text-sm px-3 py-1">
                    {scannedAsset.status}
                  </Badge>
                  {scannedAsset.category && (
                    <Badge variant="outline" className="text-xs">{scannedAsset.category.name}</Badge>
                  )}
                </div>

                {(scannedAsset.locationRef?.name || scannedAsset.location) && (
                  <p className="text-sm text-muted-foreground">
                    📍 {scannedAsset.locationRef?.name || scannedAsset.location}
                  </p>
                )}

                {/* Quick Actions */}
                <div className="space-y-2 pt-2 border-t">
                  {scannedAsset.status === 'Available' && (
                    <Button onClick={handleQuickCheckin} disabled={actionLoading} className="w-full gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Assign to Me
                    </Button>
                  )}
                  {scannedAsset.status === 'Allocated' && hasMyAllocation && (
                    <Button onClick={handleQuickCheckout} disabled={actionLoading} variant="outline" className="w-full gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Return Asset
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => router.push(`/assets/${scannedAsset.id}`)} className="w-full gap-2">
                    <ArrowRight className="h-4 w-4" /> View Full Details
                  </Button>
                  <Button variant="ghost" onClick={resetScan} className="w-full text-muted-foreground">
                    Scan Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            {/* Camera Scanner */}
            <Card>
              <CardContent className="p-4">
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="w-full rounded-lg overflow-hidden bg-black/5 min-h-[300px] flex items-center justify-center"
                >
                  {!scanning && !cameraError && (
                    <div className="text-center space-y-3 p-8">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mx-auto">
                        <ScanLine className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">Point your camera at a QR code</p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="mt-3 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <CameraOff className="h-4 w-4 inline mr-2" />
                    {cameraError}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {!scanning ? (
                    <Button onClick={startScanner} className="flex-1 gap-2">
                      <Camera className="h-4 w-4" /> Start Camera
                    </Button>
                  ) : (
                    <Button onClick={stopScanner} variant="outline" className="flex-1 gap-2">
                      <CameraOff className="h-4 w-4" /> Stop Camera
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowManual(!showManual)} className="gap-2">
                    <Keyboard className="h-4 w-4" /> Manual
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry */}
            {showManual && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">Enter Asset Tag Manually</p>
                  <div className="flex gap-2">
                    <Input
                      value={manualTag}
                      onChange={e => setManualTag(e.target.value)}
                      placeholder="e.g. AF-0001"
                      onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                      className="font-mono"
                    />
                    <Button onClick={handleManualSubmit} disabled={!manualTag.trim()}>
                      Look Up
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
