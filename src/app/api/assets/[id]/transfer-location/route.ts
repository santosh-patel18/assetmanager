import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

/**
 * POST /api/assets/:id/transfer-location
 * Transfer an asset to a different location.
 * Body: { newLocationId: string, reason?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Asset Manager only' }, { status: 403 });
    }

    const body = await request.json();
    const { newLocationId, reason } = body;

    if (!newLocationId) {
      return NextResponse.json({ error: 'newLocationId is required' }, { status: 422 });
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, assetTag: true, locationId: true },
    });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify destination location exists and is active
    const destination = await prisma.location.findUnique({
      where: { id: newLocationId },
      select: { id: true, name: true, status: true },
    });
    if (!destination) {
      return NextResponse.json({ error: 'Destination location not found' }, { status: 404 });
    }
    if (destination.status !== 'Active') {
      return NextResponse.json({ error: 'Destination location is inactive' }, { status: 400 });
    }

    // Don't transfer to same location
    if (asset.locationId === newLocationId) {
      return NextResponse.json({ error: 'Asset is already at this location' }, { status: 400 });
    }

    const previousLocationId = asset.locationId;

    // Update asset location
    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: { locationId: newLocationId },
      include: {
        locationRef: { select: { id: true, name: true, code: true, type: true } },
      },
    });

    // Log activity
    await logActivity(user.userId, 'TRANSFER_LOCATION', 'asset', asset.id, {
      asset_tag: asset.assetTag,
      from_location_id: previousLocationId,
      to_location_id: newLocationId,
      to_location_name: destination.name,
      reason: reason || null,
    });

    return NextResponse.json({
      asset: updated,
      message: `${asset.name} transferred to ${destination.name}`,
    });
  } catch (error) {
    console.error('Transfer location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
