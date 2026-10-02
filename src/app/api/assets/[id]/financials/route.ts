/**
 * GET  /api/assets/[id]/financials — Get financial details + depreciation for an asset
 * PATCH /api/assets/[id]/financials — Update financial fields on an asset
 *
 * Access:
 *   GET:   All authenticated roles (scoped by role — dept heads see dept assets only, employees see allocated only)
 *   PATCH: Admin, Finance Manager, Asset Manager
 */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { EmployeeRole, FINANCIAL_ROLES } from '@/lib/enums';
import { getDepartmentScope } from '@/lib/auth';
import { updateAssetFinancialsSchema } from '@/lib/validations/financials';
import { calculateDepreciationSchedule, getCurrentBookValue } from '@/lib/depreciation';
import { BadRequestError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logActivity } from '@/lib/activity-logger';
import { ActivityAction } from '@/lib/enums';
import type { DepreciationMethod } from '@/lib/depreciation';

type Params = { id: string };

/**
 * Verify the user has access to view this asset based on their role.
 */
async function verifyAssetAccess(assetId: string, userId: string, role: string) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: {
      id: true, name: true, assetTag: true,
      acquisitionDate: true, acquisitionCost: true,
      purchaseOrderNumber: true, invoiceNumber: true, supplier: true,
      depreciationMethod: true, usefulLifeMonths: true, salvageValue: true,
      warrantyEndDate: true, departmentId: true, categoryId: true, locationId: true,
      category: { select: { name: true } },
      department: { select: { name: true } },
      locationRef: { select: { name: true } },
      insurancePolicies: { orderBy: { endDate: 'desc' } },
      depreciationRecords: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
    },
  });

  if (!asset) throw new NotFoundError('Asset');

  // Department heads can only see their department's assets
  if (role === EmployeeRole.DEPARTMENT_HEAD) {
    const deptScope = await getDepartmentScope(userId);
    if (asset.departmentId && !deptScope.includes(asset.departmentId)) {
      throw new AuthorizationError('You can only view financial data for assets in your department');
    }
  }

  // Employees can only see assets allocated to them
  if (role === EmployeeRole.EMPLOYEE) {
    const allocation = await prisma.allocation.findFirst({
      where: {
        assetId: asset.id,
        targetType: 'employee',
        targetId: userId,
        status: 'Active',
      },
    });
    if (!allocation) {
      throw new AuthorizationError('You can only view financial data for assets allocated to you');
    }
  }

  return asset;
}

// ─── GET /api/assets/[id]/financials ─────────────────────────────
export const GET = apiHandler<Params>({
  handler: async ({ user, verifiedRole, params }) => {
    const role = verifiedRole || user!.role;
    const asset = await verifyAssetAccess(params.id, user!.userId, role);

    // Calculate current book value if depreciation is configured
    let bookValueData = null;
    if (
      asset.acquisitionCost &&
      asset.depreciationMethod &&
      asset.usefulLifeMonths &&
      asset.acquisitionDate
    ) {
      bookValueData = getCurrentBookValue(
        Number(asset.acquisitionCost),
        Number(asset.salvageValue ?? 0),
        asset.usefulLifeMonths,
        new Date(asset.acquisitionDate),
        asset.depreciationMethod as DepreciationMethod
      );
    }

    return {
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          assetTag: asset.assetTag,
          category: asset.category?.name,
          department: asset.department?.name,
          location: asset.locationRef?.name,
        },
        financials: {
          acquisitionDate: asset.acquisitionDate,
          acquisitionCost: asset.acquisitionCost ? Number(asset.acquisitionCost) : null,
          purchaseOrderNumber: asset.purchaseOrderNumber,
          invoiceNumber: asset.invoiceNumber,
          supplier: asset.supplier,
          warrantyEndDate: asset.warrantyEndDate,
        },
        depreciation: {
          method: asset.depreciationMethod,
          usefulLifeMonths: asset.usefulLifeMonths,
          salvageValue: asset.salvageValue ? Number(asset.salvageValue) : null,
          ...(bookValueData || {}),
        },
        depreciationSchedule: asset.depreciationRecords.map(r => ({
          year: r.year,
          month: r.month,
          openingValue: Number(r.openingValue),
          depreciationAmt: Number(r.depreciationAmt),
          closingValue: Number(r.closingValue),
          method: r.method,
        })),
        insurancePolicies: asset.insurancePolicies.map(p => ({
          id: p.id,
          policyNumber: p.policyNumber,
          provider: p.provider,
          coverageAmount: Number(p.coverageAmount),
          premium: p.premium ? Number(p.premium) : null,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
        })),
      },
    };
  },
});

// ─── PATCH /api/assets/[id]/financials ───────────────────────────
export const PATCH = apiHandler<Params>({
  roles: [...FINANCIAL_ROLES],
  handler: async ({ user, body, params, log }) => {
    const parsed = updateAssetFinancialsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    // Verify asset exists
    const existing = await prisma.asset.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Asset');

    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.purchaseOrderNumber !== undefined) updateData.purchaseOrderNumber = data.purchaseOrderNumber;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.depreciationMethod !== undefined) updateData.depreciationMethod = data.depreciationMethod;
    if (data.usefulLifeMonths !== undefined) updateData.usefulLifeMonths = data.usefulLifeMonths;
    if (data.salvageValue !== undefined) updateData.salvageValue = data.salvageValue;
    if (data.warrantyEndDate !== undefined) {
      updateData.warrantyEndDate = data.warrantyEndDate ? new Date(data.warrantyEndDate) : null;
    }

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true, name: true, assetTag: true,
        purchaseOrderNumber: true, invoiceNumber: true, supplier: true,
        depreciationMethod: true, usefulLifeMonths: true, salvageValue: true,
        warrantyEndDate: true,
      },
    });

    await logActivity(
      user!.userId,
      ActivityAction.ASSET_FINANCIALS_UPDATED,
      'asset',
      params.id,
      { updatedFields: Object.keys(updateData) }
    );

    log.info('Asset financials updated', { assetId: params.id, fields: Object.keys(updateData) });

    return { data: updated };
  },
});
