/**
 * Public Scan API — Returns limited asset info by asset tag
 * No auth required — used when someone scans a QR code
 * 
 * GET /api/public/scan/:tag
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  context: { params: Promise<{ tag: string }> }
) {
  const { tag } = await context.params;

  const asset = await prisma.asset.findFirst({
    where: { assetTag: tag, deletedAt: null },
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      location: true,
      photoUrl: true,
      isBookable: true,
      category: { select: { name: true } },
      department: { select: { name: true } },
      locationRef: { select: { name: true, type: true } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  return NextResponse.json({
    asset: {
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      status: asset.status,
      condition: asset.condition,
      location: asset.locationRef?.name || asset.location || null,
      locationType: asset.locationRef?.type || null,
      photoUrl: asset.photoUrl,
      isBookable: asset.isBookable,
      categoryName: asset.category?.name || null,
      departmentName: asset.department?.name || null,
    },
  });
}
