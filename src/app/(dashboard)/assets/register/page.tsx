'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationTreeSelect, type LocationNode } from '@/components/ui/location-tree-select';
import { DynamicFieldRenderer, type FieldSchema } from '@/components/ui/dynamic-fields';
import { useToast } from '@/components/ui/toast-notification';
import { Save, Loader2 } from 'lucide-react';
import type { AssetCategory, Department } from '@/types';

export default function RegisterAssetPage() {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [form, setForm] = useState({
    name: '', category_id: '', serial_number: '', acquisition_date: '',
    acquisition_cost: '', condition: '', location_id: null as string | null,
    department_id: '', is_bookable: false,
  });
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the selected category's field schema
  const selectedCategory = categories.find(c => c.id === form.category_id);
  const fieldSchema = (selectedCategory?.fieldSchema || {}) as FieldSchema;

  useEffect(() => {
    document.title = 'Register Asset | AssetFlow';
    Promise.all([
      fetch('/api/org/categories').then(r => r.json()),
      fetch('/api/org/departments').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ]).then(([c, d, l]) => {
      setCategories(c.categories || []);
      setDepartments(d.departments || []);
      setLocations(l.locations || []);
    });
  }, []);

  // Reset attributes when category changes
  useEffect(() => {
    setAttributes({});
  }, [form.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        category_id: form.category_id,
        serial_number: form.serial_number || null,
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
        condition: form.condition || null,
        location_id: form.location_id || null,
        department_id: form.department_id || null,
        is_bookable: form.is_bookable,
        attributes,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success('Asset registered', `${data.asset.name} (${data.asset.assetTag}) created successfully.`);
      router.push(`/assets/${data.asset.id}`);
    } else {
      setError(data.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header title="Register Asset" />
      <div className="p-6 max-w-3xl mx-auto page-enter">
        <Card>
          <CardHeader>
            <CardTitle>New Asset Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label>Category *</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.status === 'Active').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div><Label>Acquisition Date</Label><Input type="date" value={form.acquisition_date} onChange={e => setForm({ ...form, acquisition_date: e.target.value })} /></div>
                <div><Label>Acquisition Cost</Label><Input type="number" step="0.01" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: e.target.value })} /></div>
                <div><Label>Condition</Label><Input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="New, Good, Fair, Poor" /></div>
                <div>
                  <Label>Location</Label>
                  <LocationTreeSelect
                    locations={locations.filter(l => l.status === 'Active')}
                    value={form.location_id}
                    onChange={v => setForm({ ...form, location_id: v })}
                    placeholder="Select location..."
                  />
                </div>
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{departments.filter(d => d.status === 'Active').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="bookable" checked={form.is_bookable} onChange={e => setForm({ ...form, is_bookable: e.target.checked })} className="rounded" />
                <Label htmlFor="bookable">Bookable / Shared Resource</Label>
              </div>

              {/* Dynamic custom fields based on category */}
              {form.category_id && Object.keys(fieldSchema).length > 0 && (
                <div className="space-y-3">
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold">
                      {selectedCategory?.name} Custom Fields
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      These fields are specific to the selected category.
                    </p>
                    <DynamicFieldRenderer
                      fieldSchema={fieldSchema}
                      values={attributes}
                      onChange={setAttributes}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Register Asset
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
