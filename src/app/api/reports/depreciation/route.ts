/**
 * GET /api/reports/depreciation — Depreciation report across all depreciable assets
 *
 * Returns a table of all assets with depreciation configured, showing:
 *   - Current book value, total depreciation, % depreciated, monthly rate
 *
 * Access: Admin, Finance Manager, Asset Manager (full org), Dept Head (dept-scoped)
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { EmployeeRole, FINANCIAL_VIEW_ROLES } from '@/lib/enums';
import { getDepartmentScope } from '@/lib/auth';
import { getCurrentBookValue } from '@/lib/depreciation';
import type { DepreciationMethod } from '@/lib/depreciation';
import { parsePagination } from '@/lib/pagination';

export const GET = apiHandler({
  roles: [...FINANCIAL_VIEW_ROLES],
  handler: async ({ user, verifiedRole, request }) => {
    const { skip, page, limit } = parsePagination(request);

    const where: Record<string, unknown> = {
      deletedAt: null,
      depreciationMethod: { not: null },
      acquisitionCost: { not: null },
      usefulLifeMonths: { not: null },
      acquisitionDate: { not: null },
    };

    if (verifiedRole === EmployeeRole.DEPARTMENT_HEAD) {
      const deptScope = await getDepartmentScope(user!.userId);
      where.departmentId = { in: deptScope };
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, assetTag: true,
          acquisitionDate: true, acquisitionCost: true,
          depreciationMethod: true, usefulLifeMonths: true, salvageValue: true,
          category: { select: { name: true } },
          department: { select: { name: true } },
          locationRef: { select: { name: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    const report = assets.map(asset => {
      const cost = Number(asset.acquisitionCost);
      const salvage = Number(asset.salvageValue ?? 0);
      const bv = getCurrentBookValue(
        cost, salvage,
        asset.usefulLifeMonths!,
        new Date(asset.acquisitionDate!),
        asset.depreciationMethod as DepreciationMethod
      );

      const monthlyDepreciation = asset.usefulLifeMonths! > 0
        ? Math.round(((cost - salvage) / asset.usefulLifeMonths!) * 100) / 100
        : 0;

      return {
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        category: asset.category?.name,
        department: asset.department?.name,
        location: asset.locationRef?.name,
        method: asset.depreciationMethod,
        acquisitionCost: cost,
        salvageValue: salvage,
        usefulLifeMonths: asset.usefulLifeMonths,
        monthlyDepreciation,
        ...bv,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: {
        data: report,
        pagination: {
          page, limit, total, totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  },
});
