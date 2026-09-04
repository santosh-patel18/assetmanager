import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    // Build asset filter for location scoping
    const assetWhere: Record<string, unknown> = {};
    if (locationId) assetWhere.locationId = locationId;

    // Utilization: count assets by status
    const statusCounts = await prisma.asset.groupBy({
      by: ['status'],
      where: assetWhere,
      _count: { id: true },
    });

    // Most allocated assets (scoped by location)
    const assetIds = locationId
      ? (await prisma.asset.findMany({ where: assetWhere, select: { id: true } })).map(a => a.id)
      : null;

    const topAllocated = await prisma.allocation.groupBy({
      by: ['assetId'],
      ...(assetIds ? { where: { assetId: { in: assetIds } } } : {}),
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topAssetIds = topAllocated.map(a => a.assetId);
    const topAssets = await prisma.asset.findMany({
      where: { id: { in: topAssetIds } },
      select: { id: true, name: true, assetTag: true },
    });

    const utilization = topAllocated.map(a => ({
      ...topAssets.find(asset => asset.id === a.assetId),
      allocation_count: a._count.id,
    }));

    return NextResponse.json({ statusCounts, utilization });
  } catch (error) {
    console.error('Utilization report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
