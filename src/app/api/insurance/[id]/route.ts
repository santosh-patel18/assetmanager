/**
 * PATCH  /api/insurance/[id] — Update an insurance policy
 * DELETE /api/insurance/[id] — Cancel/delete a policy
 *
 * Access: Admin, Finance Manager, Asset Manager
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { FINANCIAL_ROLES, ActivityAction } from '@/lib/enums';
import { updateInsurancePolicySchema } from '@/lib/validations/insurance';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { logActivity } from '@/lib/activity-logger';

type Params = { id: string };

// ─── PATCH /api/insurance/[id] ───────────────────────────────────
export const PATCH = apiHandler<Params>({
  roles: [...FINANCIAL_ROLES],
  handler: async ({ user, body, params, log }) => {
    const parsed = updateInsurancePolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    const existing = await prisma.insurancePolicy.findUnique({
      where: { id: params.id },
      select: { id: true, assetId: true },
    });
    if (!existing) throw new NotFoundError('Insurance policy');

    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.coverageAmount !== undefined) updateData.coverageAmount = data.coverageAmount;
    if (data.premium !== undefined) updateData.premium = data.premium;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.insurancePolicy.update({
      where: { id: params.id },
      data: updateData,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });

    await logActivity(
      user!.userId,
      ActivityAction.INSURANCE_UPDATED,
      'insurance_policy',
      params.id,
      { updatedFields: Object.keys(updateData) }
    );

    log.info('Insurance policy updated', { policyId: params.id });

    return {
      data: {
        ...updated,
        coverageAmount: Number(updated.coverageAmount),
        premium: updated.premium ? Number(updated.premium) : null,
      },
    };
  },
});

// ─── DELETE /api/insurance/[id] ──────────────────────────────────
export const DELETE = apiHandler<Params>({
  roles: [...FINANCIAL_ROLES],
  handler: async ({ user, params, log }) => {
    const existing = await prisma.insurancePolicy.findUnique({
      where: { id: params.id },
      select: { id: true, policyNumber: true, assetId: true },
    });
    if (!existing) throw new NotFoundError('Insurance policy');

    // Soft-cancel: set status to Cancelled rather than hard-delete
    await prisma.insurancePolicy.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    await logActivity(
      user!.userId,
      ActivityAction.INSURANCE_CANCELLED,
      'insurance_policy',
      params.id,
      { policyNumber: existing.policyNumber, assetId: existing.assetId }
    );

    log.info('Insurance policy cancelled', { policyId: params.id });

    return { data: { message: 'Insurance policy cancelled' } };
  },
});
