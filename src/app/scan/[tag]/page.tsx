'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStatusVariant } from '@/lib/utils';
import { Package, MapPin, Tag, Shield, ArrowRight, QrCode } from 'lucide-react';
import Link from 'next/link';

interface ScanAsset {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  condition: string | null;
  location: string | null;
  locationType: string | null;
  photoUrl: string | null;
  isBookable: boolean;
  categoryName: string | null;
  departmentName: string | null;
}

export default function PublicScanPage() {
  const params = useParams();
  const tag = params.tag as string;
  const [asset, setAsset] = useState<ScanAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `Scan — ${tag} | AssetFlow`;
    fetch(`/api/public/scan/${tag}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setAsset(d.asset);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load asset'); setLoading(false); });
  }, [tag]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto animate-pulse">
            <QrCode className="h-8 w-8" />
          </div>
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 mx-auto">
              <Package className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold">Asset Not Found</h1>
            <p className="text-muted-foreground text-sm">
              The asset with tag <code className="bg-muted px-2 py-0.5 rounded font-mono">{tag}</code> was not found.
            </p>
            <Link href="/login">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowRight className="h-4 w-4" /> Sign In to AssetFlow
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-md bg-white/20 flex items-center justify-center text-sm font-bold">AF</div>
            <span className="text-sm font-medium opacity-80">AssetFlow</span>
          </div>
          {asset.photoUrl ? (
            <div className="mt-4 mb-3">
              <img
                src={asset.photoUrl}
                alt={asset.name}
                className="h-32 w-32 rounded-xl object-cover mx-auto border-2 border-white/20 shadow-lg"
              />
            </div>
          ) : (
            <div className="mt-4 mb-3 h-20 w-20 rounded-xl bg-white/10 flex items-center justify-center mx-auto">
              <Package className="h-10 w-10 opacity-60" />
            </div>
          )}
          <h1 className="text-xl font-bold">{asset.name}</h1>
          <p className="text-white/70 font-mono text-sm mt-1">{asset.assetTag}</p>
        </div>

        {/* Asset details */}
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant={getStatusVariant(asset.status)} className="text-sm px-3 py-1">
              {asset.status}
            </Badge>
            {asset.isBookable && (
              <Badge variant="outline" className="text-sm px-3 py-1">Bookable</Badge>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {asset.categoryName && (
              <div className="flex items-center gap-3 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium ml-auto">{asset.categoryName}</span>
              </div>
            )}
            {asset.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium ml-auto">{asset.location}</span>
              </div>
            )}
            {asset.condition && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Condition:</span>
                <span className="font-medium ml-auto">{asset.condition}</span>
              </div>
            )}
            {asset.departmentName && (
              <div className="flex items-center gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium ml-auto">{asset.departmentName}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <Link href={`/assets/${asset.id}`}>
              <Button className="w-full gap-2">
                <ArrowRight className="h-4 w-4" /> View Full Details
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              Sign in required to view full asset history
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
