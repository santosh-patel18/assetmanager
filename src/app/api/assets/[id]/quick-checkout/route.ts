/**
 * Quick Check-Out — Return an asset allocated to the current user
 * POST /api/assets/:id/quick-checkout
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { AppError } from '@/lib/errors';

export const POST = apiHandler<{ id: string }>({
  handler: async ({ user, params, log }) => {
    const asset = await prisma.asset.findUnique({
      where: { id: params.id, deletedAt: null },
      select: { id: true, assetTag: true, name: true, status: true },
    });

    if (!asset) throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');

    // Find active allocation for this user
    const allocation = await prisma.allocation.findFirst({
      where: {
        assetId: asset.id,
        targetType: 'employee',
        targetId: user!.userId,
        status: 'Active',
      },
    });

    if (!allocation) {
      throw new AppError('No active allocation found for this asset', 400, 'NO_ALLOCATION');
    }

    // Close allocation + update asset status
    await prisma.$transaction(async (tx) => {
      await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          status: 'Returned',
          returnedAt: new Date(),
        },
      });

      await tx.asset.update({
        where: { id: asset.id },
        data: { status: 'Available' },
      });

      await tx.assetStateLog.create({
        data: {
          assetId: asset.id,
          fromStatus: 'Allocated',
          toStatus: 'Available',
          changedBy: user!.userId,
        },
      });
    });

    log.info('Quick check-out', { assetId: asset.id, assetTag: asset.assetTag });
    await logActivity(user!.userId, 'QUICK_CHECKOUT', 'asset', asset.id, {
      assetTag: asset.assetTag,
      assetName: asset.name,
    });

    return {
      data: { message: `${asset.name} has been returned successfully` },
    };
  },
});
