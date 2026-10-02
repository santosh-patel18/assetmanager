/**
 * POST /api/assets/[id]/depreciation — Calculate and store depreciation schedule
 *
 * Access: Admin, Finance Manager, Asset Manager
 *
 * Calculates the full depreciation schedule based on the asset's financial config
 * and stores it as DepreciationRecord entries (replaces existing records).
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { FINANCIAL_ROLES, ActivityAction } from '@/lib/enums';
import { calculateDepreciationSchema } from '@/lib/validations/financials';
import { calculateDepreciationSchedule } from '@/lib/depreciation';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { logActivity } from '@/lib/activity-logger';
import type { DepreciationMethod } from '@/lib/depreciation';

type Params = { id: string };

export const POST = apiHandler<Params>({
  roles: [...FINANCIAL_ROLES],
  handler: async ({ user, body, params, log }) => {
    const parsed = calculateDepreciationSchema.safeParse(body || {});
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    // Fetch asset with financial config
    const asset = await prisma.asset.findFirst({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true, name: true,
        acquisitionDate: true, acquisitionCost: true,
        depreciationMethod: true, usefulLifeMonths: true, salvageValue: true,
      },
    });
    if (!asset) throw new NotFoundError('Asset');

    // Use overrides or asset's configured values
    const method = (parsed.data.method || asset.depreciationMethod) as DepreciationMethod | null;
    const usefulLifeMonths = parsed.data.usefulLifeMonths ?? asset.usefulLifeMonths;
    const salvageValue = parsed.data.salvageValue ?? (asset.salvageValue ? Number(asset.salvageValue) : 0);
    const acquisitionCost = asset.acquisitionCost ? Number(asset.acquisitionCost) : null;
    const acquisitionDate = asset.acquisitionDate;

    if (!method) {
      throw new BadRequestError('Depreciation method is not configured. Set it on the asset or pass it in the request.');
    }
    if (!usefulLifeMonths) {
      throw new BadRequestError('Useful life (months) is not configured. Set it on the asset or pass it in the request.');
    }
    if (!acquisitionCost || acquisitionCost <= 0) {
      throw new BadRequestError('Acquisition cost must be set and greater than 0.');
    }
    if (!acquisitionDate) {
      throw new BadRequestError('Acquisition date must be set on the asset.');
    }

    // Calculate full schedule
    const schedule = calculateDepreciationSchedule(
      acquisitionCost, salvageValue, usefulLifeMonths,
      new Date(acquisitionDate), method
    );

    if (schedule.length === 0) {
      throw new BadRequestError('Could not generate a depreciation schedule. Check that acquisition cost exceeds salvage value.');
    }

    // Replace existing records (delete old, insert new) in a transaction
    await prisma.$transaction([
      prisma.depreciationRecord.deleteMany({ where: { assetId: params.id } }),
      prisma.depreciationRecord.createMany({
        data: schedule.map(entry => ({
          assetId: params.id,
          year: entry.year,
          month: entry.month,
          openingValue: entry.openingValue,
          depreciationAmt: entry.depreciationAmt,
          closingValue: entry.closingValue,
          method,
        })),
      }),
      // Also update the asset's depreciation config if overrides were provided
      prisma.asset.update({
        where: { id: params.id },
        data: {
          ...(parsed.data.method && { depreciationMethod: parsed.data.method }),
          ...(parsed.data.usefulLifeMonths && { usefulLifeMonths: parsed.data.usefulLifeMonths }),
          ...(parsed.data.salvageValue !== undefined && { salvageValue: parsed.data.salvageValue }),
        },
      }),
    ]);

    await logActivity(
      user!.userId,
      ActivityAction.DEPRECIATION_CALCULATED,
      'asset',
      params.id,
      { method, usefulLifeMonths, salvageValue, totalEntries: schedule.length }
    );

    log.info('Depreciation calculated', {
      assetId: params.id, method, months: usefulLifeMonths, entries: schedule.length,
    });

    return {
      data: {
        assetId: params.id,
        assetName: asset.name,
        method,
        usefulLifeMonths,
        acquisitionCost,
        salvageValue,
        totalEntries: schedule.length,
        schedule: schedule.slice(0, 12), // Return first year preview
        message: `Depreciation schedule calculated: ${schedule.length} monthly entries`,
      },
      status: 201,
    };
  },
});
