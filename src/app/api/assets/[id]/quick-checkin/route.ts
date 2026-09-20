/**
 * Quick Check-In — Self-assign an available asset
 * POST /api/assets/:id/quick-checkin
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
    if (asset.status !== 'Available') {
      throw new AppError(`Asset is currently ${asset.status} and cannot be checked in`, 400, 'ASSET_UNAVAILABLE');
    }

    // Create allocation + update asset status in a transaction
    const allocation = await prisma.$transaction(async (tx) => {
      const alloc = await tx.allocation.create({
        data: {
          assetId: asset.id,
          targetType: 'employee',
          targetId: user!.userId,
          allocatedBy: user!.userId,
          status: 'Active',
        },
      });

      await tx.asset.update({
        where: { id: asset.id },
        data: { status: 'Allocated' },
      });

      // Log state transition
      await tx.assetStateLog.create({
        data: {
          assetId: asset.id,
          fromStatus: 'Available',
          toStatus: 'Allocated',
          changedBy: user!.userId,
        },
      });

      return alloc;
    });

    log.info('Quick check-in', { assetId: asset.id, assetTag: asset.assetTag });
    await logActivity(user!.userId, 'QUICK_CHECKIN', 'asset', asset.id, {
      assetTag: asset.assetTag,
      assetName: asset.name,
    });

    return {
      data: { message: `${asset.name} has been assigned to you`, allocation },
      status: 201,
    };
  },
});
