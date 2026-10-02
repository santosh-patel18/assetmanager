'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import {
  IndianRupee, DollarSign, Euro, PoundSterling,
  TrendingDown, Shield, AlertTriangle, Download,
  ChevronLeft, ChevronRight, Calculator,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────

interface FinancialSummary {
  totalAcquisitionCost: number;
  totalCurrentBookValue: number;
  totalInsuranceCoverage: number;
  expiringPoliciesCount: number;
  byCategory: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  byLocation: { name: string; value: number }[];
}

interface DepreciationAsset {
  id: string;
  name: string;
  assetTag: string;
  category?: string;
  department?: string;
  location?: string;
  method: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  monthlyDepreciation: number;
  bookValue: number;
  totalDepreciation: number;
  percentDepreciated: number;
  monthsElapsed: number;
}

interface InsurancePolicyItem {
  id: string;
  policyNumber: string;
  provider: string;
  coverageAmount: number;
  premium: number | null;
  startDate: string;
  endDate: string;
  status: string;
  asset: {
    id: string;
    name: string;
    assetTag: string;
    department?: { name: string } | null;
    locationRef?: { name: string } | null;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Constants ───────────────────────────────────────────────────

const CURRENCIES = [
  { symbol: '₹', label: 'INR', icon: IndianRupee },
  { symbol: '$', label: 'USD', icon: DollarSign },
  { symbol: '€', label: 'EUR', icon: Euro },
  { symbol: '£', label: 'GBP', icon: PoundSterling },
];

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8',
  '#4f46e5', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
];

const METHOD_LABELS: Record<string, string> = {
  straight_line: 'Straight-Line',
  declining_balance: 'Declining Balance',
  sum_of_years: 'Sum-of-Years',
};

// ─── Component ───────────────────────────────────────────────────

export default function FinancialsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [depAssets, setDepAssets] = useState<DepreciationAsset[]>([]);
  const [depPagination, setDepPagination] = useState<PaginationMeta | null>(null);
  const [depPage, setDepPage] = useState(1);
  const [policies, setPolicies] = useState<InsurancePolicyItem[]>([]);
  const [insPagination, setInsPagination] = useState<PaginationMeta | null>(null);
  const [insPage, setInsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currencyIdx, setCurrencyIdx] = useState(0);
  const currency = CURRENCIES[currencyIdx];

  const isFinancialEditor = user && ['admin', 'finance_manager', 'asset_manager'].includes(user.role);

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/financial');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch { /* swallow */ }
  }, []);

  const fetchDepreciation = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/reports/depreciation?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setDepAssets(data.data);
        setDepPagination(data.pagination);
      }
    } catch { /* swallow */ }
  }, []);

  const fetchInsurance = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/insurance?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.data);
        setInsPagination(data.pagination);
      }
    } catch { /* swallow */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchDepreciation(depPage), fetchInsurance(insPage)]);
    setLoading(false);
  }, [fetchSummary, fetchDepreciation, fetchInsurance, depPage, insPage]);

  useEffect(() => {
    document.title = 'Financials | Smart Ledger';
    loadAll();
  }, [loadAll]);

  useFocusRefresh(loadAll);

  // ─── Helpers ────────────────────────────────────────────────────

  const fmt = (n: number) => `${currency.symbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const daysUntilExpiry = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const expiryBadge = (endDate: string) => {
    const days = daysUntilExpiry(endDate);
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 7) return <Badge variant="destructive">{days}d left</Badge>;
    if (days <= 30) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{days}d left</Badge>;
    return <Badge variant="secondary">{days}d left</Badge>;
  };

  const handleExportCSV = async (type: 'depreciation' | 'insurance') => {
    try {
      const endpoint = type === 'depreciation'
        ? '/api/reports/depreciation?limit=9999'
        : '/api/insurance?limit=9999';
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data;

      let csv = '';
      if (type === 'depreciation') {
        csv = 'Asset,Tag,Category,Department,Method,Acquisition Cost,Salvage Value,Book Value,Total Depreciation,% Depreciated\n';
        for (const a of items) {
          csv += `"${a.name}","${a.assetTag}","${a.category || ''}","${a.department || ''}","${METHOD_LABELS[a.method] || a.method}",${a.acquisitionCost},${a.salvageValue},${a.bookValue},${a.totalDepreciation},${a.percentDepreciated}\n`;
        }
      } else {
        csv = 'Policy #,Provider,Asset,Coverage,Premium,Start Date,End Date,Status\n';
        for (const p of items) {
          csv += `"${p.policyNumber}","${p.provider}","${p.asset?.name || ''}",${p.coverageAmount},${p.premium || 0},"${p.startDate}","${p.endDate}","${p.status}"\n`;
        }
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartledger_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* swallow */ }
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Financials" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header title="Financials" />
        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex items-center bg-card border border-border rounded-lg p-1">
            {CURRENCIES.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setCurrencyIdx(i)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  i === currencyIdx
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Asset Value</CardTitle>
            <currency.icon className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(summary?.totalAcquisitionCost || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Acquisition cost of all assets</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Book Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(summary?.totalCurrentBookValue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">After depreciation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Insurance Coverage</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(summary?.totalInsuranceCoverage || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Active policies coverage</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${(summary?.expiringPoliciesCount || 0) > 0 ? 'border-l-amber-500' : 'border-l-slate-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Policies</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(summary?.expiringPoliciesCount || 0) > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.expiringPoliciesCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="valuation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        {/* ─── Valuation Tab ──────────────────────────────────────── */}
        <TabsContent value="valuation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart: By Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Value by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {(summary?.byCategory?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summary!.byCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {summary!.byCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => fmt(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No asset data available</p>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart: By Department */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Value by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {(summary?.byDepartment?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary!.byDepartment} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `${currency.symbol}${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(value: number) => fmt(value)} />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No department data</p>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart: By Location */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Value by Location</CardTitle>
              </CardHeader>
              <CardContent>
                {(summary?.byLocation?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={summary!.byLocation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${currency.symbol}${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(value: number) => fmt(value)} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No location data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Depreciation Tab ────────────────────────────────────── */}
        <TabsContent value="depreciation" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Assets with depreciation configured ({depPagination?.total || 0} total)
            </p>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV('depreciation')}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Method</th>
                      <th className="text-right p-3 font-medium">Cost</th>
                      <th className="text-right p-3 font-medium">Book Value</th>
                      <th className="text-right p-3 font-medium">Monthly Dep.</th>
                      <th className="text-right p-3 font-medium">% Depreciated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depAssets.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No assets with depreciation configured
                      </td></tr>
                    ) : (
                      depAssets.map((a) => (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.assetTag}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{a.category || '—'}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-xs">
                              {METHOD_LABELS[a.method] || a.method}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono">{fmt(a.acquisitionCost)}</td>
                          <td className="p-3 text-right font-mono">{fmt(a.bookValue)}</td>
                          <td className="p-3 text-right font-mono text-amber-400">{fmt(a.monthlyDepreciation)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(a.percentDepreciated, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono w-12 text-right">{a.percentDepreciated.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {depPagination && depPagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {depPagination.page} of {depPagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={!depPagination.hasPreviousPage}
                  onClick={() => { setDepPage(p => p - 1); fetchDepreciation(depPage - 1); }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={!depPagination.hasNextPage}
                  onClick={() => { setDepPage(p => p + 1); fetchDepreciation(depPage + 1); }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Insurance Tab ────────────────────────────────────────── */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Insurance policies ({insPagination?.total || 0} total)
            </p>
            <Button variant="outline" size="sm" onClick={() => handleExportCSV('insurance')}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium">Policy #</th>
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-left p-3 font-medium">Provider</th>
                      <th className="text-right p-3 font-medium">Coverage</th>
                      <th className="text-right p-3 font-medium">Premium</th>
                      <th className="text-left p-3 font-medium">Expiry</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      {isFinancialEditor && <th className="text-right p-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {policies.length === 0 ? (
                      <tr><td colSpan={isFinancialEditor ? 8 : 7} className="text-center py-12 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No insurance policies found
                      </td></tr>
                    ) : (
                      policies.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs">{p.policyNumber}</td>
                          <td className="p-3">
                            <div className="font-medium">{p.asset?.name}</div>
                            <div className="text-xs text-muted-foreground">{p.asset?.assetTag}</div>
                          </td>
                          <td className="p-3">{p.provider}</td>
                          <td className="p-3 text-right font-mono">{fmt(p.coverageAmount)}</td>
                          <td className="p-3 text-right font-mono">{p.premium ? fmt(p.premium) : '—'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">{new Date(p.endDate).toLocaleDateString()}</span>
                              {p.status === 'Active' && expiryBadge(p.endDate)}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              p.status === 'Active' ? 'default' :
                              p.status === 'Expired' ? 'destructive' : 'secondary'
                            }>
                              {p.status}
                            </Badge>
                          </td>
                          {isFinancialEditor && (
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost" size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={async () => {
                                  await fetch(`/api/insurance/${p.id}`, { method: 'DELETE' });
                                  fetchInsurance(insPage);
                                  fetchSummary();
                                }}
                              >
                                Cancel
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {insPagination && insPagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {insPagination.page} of {insPagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={!insPagination.hasPreviousPage}
                  onClick={() => { setInsPage(p => p - 1); fetchInsurance(insPage - 1); }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={!insPagination.hasNextPage}
                  onClick={() => { setInsPage(p => p + 1); fetchInsurance(insPage + 1); }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
