/**
 * GET /api/reports/financial — Aggregated financial data for the dashboard
 *
 * Returns:
 *   - Total acquisition cost
 *   - Total current book value (computed)
 *   - Total insurance coverage
 *   - Expiring policies count (30 days)
 *   - Value breakdown by category, department, location
 *
 * Access: Admin, Finance Manager, Asset Manager (full org), Dept Head (dept-scoped)
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { EmployeeRole, FINANCIAL_VIEW_ROLES } from '@/lib/enums';
import { getDepartmentScope } from '@/lib/auth';
import { getCurrentBookValue } from '@/lib/depreciation';
import type { DepreciationMethod } from '@/lib/depreciation';

export const GET = apiHandler({
  roles: [...FINANCIAL_VIEW_ROLES],
  handler: async ({ user, verifiedRole }) => {
    // Build asset scope filter
    const assetWhere: Record<string, unknown> = { deletedAt: null };
    if (verifiedRole === EmployeeRole.DEPARTMENT_HEAD) {
      const deptScope = await getDepartmentScope(user!.userId);
      assetWhere.departmentId = { in: deptScope };
    }

    // Fetch all assets with financial data
    const assets = await prisma.asset.findMany({
      where: assetWhere,
      select: {
        id: true, acquisitionCost: true, acquisitionDate: true,
        depreciationMethod: true, usefulLifeMonths: true, salvageValue: true,
        categoryId: true, departmentId: true, locationId: true,
        category: { select: { name: true } },
        department: { select: { name: true } },
        locationRef: { select: { name: true } },
      },
    });

    // Calculate totals
    let totalAcquisitionCost = 0;
    let totalCurrentBookValue = 0;

    const byCategoryMap = new Map<string, number>();
    const byDepartmentMap = new Map<string, number>();
    const byLocationMap = new Map<string, number>();

    for (const asset of assets) {
      const cost = asset.acquisitionCost ? Number(asset.acquisitionCost) : 0;
      totalAcquisitionCost += cost;

      // Calculate book value
      let bookValue = cost;
      if (
        cost > 0 && asset.depreciationMethod && asset.usefulLifeMonths && asset.acquisitionDate
      ) {
        const bv = getCurrentBookValue(
          cost,
          Number(asset.salvageValue ?? 0),
          asset.usefulLifeMonths,
          new Date(asset.acquisitionDate),
          asset.depreciationMethod as DepreciationMethod
        );
        bookValue = bv.bookValue;
      }
      totalCurrentBookValue += bookValue;

      // Aggregate by category
      const catName = asset.category?.name || 'Uncategorized';
      byCategoryMap.set(catName, (byCategoryMap.get(catName) || 0) + cost);

      // Aggregate by department
      const deptName = asset.department?.name || 'Unassigned';
      byDepartmentMap.set(deptName, (byDepartmentMap.get(deptName) || 0) + cost);

      // Aggregate by location
      const locName = asset.locationRef?.name || 'Unassigned';
      byLocationMap.set(locName, (byLocationMap.get(locName) || 0) + cost);
    }

    // Insurance totals
    const insuranceWhere: Record<string, unknown> = { status: 'Active' };
    if (verifiedRole === EmployeeRole.DEPARTMENT_HEAD) {
      const deptScope = await getDepartmentScope(user!.userId);
      insuranceWhere.asset = { departmentId: { in: deptScope } };
    }

    const insuranceAgg = await prisma.insurancePolicy.aggregate({
      where: insuranceWhere,
      _sum: { coverageAmount: true },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringCount = await prisma.insurancePolicy.count({
      where: {
        ...insuranceWhere,
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    const mapToArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

    return {
      data: {
        totalAcquisitionCost: Math.round(totalAcquisitionCost * 100) / 100,
        totalCurrentBookValue: Math.round(totalCurrentBookValue * 100) / 100,
        totalInsuranceCoverage: Number(insuranceAgg._sum.coverageAmount || 0),
        expiringPoliciesCount: expiringCount,
        byCategory: mapToArray(byCategoryMap),
        byDepartment: mapToArray(byDepartmentMap),
        byLocation: mapToArray(byLocationMap),
      },
    };
  },
});
