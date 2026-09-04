import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const locationId = searchParams.get('locationId');

    if (type === 'csv') {
      // Build filter
      const where: Record<string, unknown> = {};
      if (locationId) where.locationId = locationId;

      // Fetch assets with category and location info
      const assets = await prisma.asset.findMany({
        where,
        include: {
          category: { select: { name: true, fieldSchema: true } },
          department: { select: { name: true } },
          locationRef: { select: { name: true } },
        },
      });

      // Collect all unique custom field keys across categories
      const allCustomKeys = new Set<string>();
      for (const asset of assets) {
        const schema = (asset.category?.fieldSchema || {}) as Record<string, unknown>;
        for (const key of Object.keys(schema)) {
          allCustomKeys.add(key);
        }
      }
      const customKeys = Array.from(allCustomKeys).sort();

      // Format custom field header labels
      const formatLabel = (key: string) =>
        key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\b\w/g, c => c.toUpperCase());

      // Build CSV
      const standardHeaders = ['Asset Tag', 'Name', 'Category', 'Status', 'Serial Number', 'Location', 'Department', 'Condition', 'Acquisition Date', 'Acquisition Cost'];
      const customHeaders = customKeys.map(formatLabel);
      const header = [...standardHeaders, ...customHeaders].map(h => `"${h}"`).join(',');

      const escape = (v: unknown): string => {
        const s = v !== undefined && v !== null ? String(v) : '';
        return `"${s.replace(/"/g, '""')}"`;
      };

      const rows = assets.map(a => {
        const attrs = (a.attributes || {}) as Record<string, unknown>;
        const locationName = a.locationRef?.name || a.location || '';
        const standardCols = [
          a.assetTag, a.name, a.category.name, a.status,
          a.serialNumber || '', locationName,
          a.department?.name || '', a.condition || '',
          a.acquisitionDate || '', a.acquisitionCost || '',
        ];
        const customCols = customKeys.map(k => attrs[k] ?? '');
        return [...standardCols, ...customCols].map(escape).join(',');
      }).join('\n');

      return new Response(header + '\n' + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="assetflow_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Specify type=csv' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
