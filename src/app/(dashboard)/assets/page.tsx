'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getStatusVariant } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Package, Plus, Search, Eye } from 'lucide-react';

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAssets = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    fetch(`/api/assets?${params}`)
      .then(r => r.json())
      .then(d => { setAssets(d.assets || []); setLoading(false); });
  };

  useEffect(() => {
    fetchAssets();
    fetch('/api/org/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => { const t = setTimeout(fetchAssets, 300); return () => clearTimeout(t); }, [search, statusFilter, categoryFilter]);

  return (
    <div className="min-h-screen">
      <Header title="Asset Directory" />
      <div className="p-6 space-y-6 page-enter">
        {/* Filters + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[280px]" />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Allocated">Allocated</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(user?.role === 'admin' || user?.role === 'asset_manager') && (
            <Link href="/assets/register">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Register Asset</Button>
            </Link>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : assets.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No assets found"
            description={search || statusFilter || categoryFilter
              ? "Try adjusting your search or filter criteria."
              : "Get started by registering your first asset."}
            action={
              (user?.role === 'admin' || user?.role === 'asset_manager')
                ? { label: 'Register Asset', onClick: () => window.location.href = '/assets/register' }
                : undefined
            }
          />
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset Tag</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Location</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Department</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      className="border-t table-row-hover opacity-0 animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="p-3 text-sm font-mono font-medium text-primary">{asset.assetTag}</td>
                      <td className="p-3 text-sm font-medium">{asset.name}</td>
                      <td className="p-3 text-sm hidden md:table-cell">{asset.category?.name}</td>
                      <td className="p-3"><Badge variant={getStatusVariant(asset.status)} className="text-xs">{asset.status}</Badge></td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{asset.location || '—'}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{asset.department?.name || '—'}</td>
                      <td className="p-3">
                        <Link href={`/assets/${asset.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 h-8 hover:text-primary transition-colors"><Eye className="h-3 w-3" /> View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Result count */}
            <p className="text-xs text-muted-foreground text-center">
              Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
