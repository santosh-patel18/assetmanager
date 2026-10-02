/**
 * GET /api/insurance/expiring — List policies expiring within N days
 *
 * Access: Admin, Finance Manager, Asset Manager, Dept Head (dept-scoped)
 * Query: ?days=30 (default 30)
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { EmployeeRole, FINANCIAL_VIEW_ROLES } from '@/lib/enums';
import { getDepartmentScope } from '@/lib/auth';

export const GET = apiHandler({
  roles: [...FINANCIAL_VIEW_ROLES],
  handler: async ({ user, verifiedRole, request }) => {
    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 365);
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      status: 'Active',
      endDate: { gte: now, lte: cutoff },
    };

    // Dept Head scoping
    if (verifiedRole === EmployeeRole.DEPARTMENT_HEAD) {
      const deptScope = await getDepartmentScope(user!.userId);
      where.asset = { departmentId: { in: deptScope } };
    }

    const policies = await prisma.insurancePolicy.findMany({
      where,
      orderBy: { endDate: 'asc' },
      include: {
        asset: {
          select: {
            id: true, name: true, assetTag: true,
            department: { select: { name: true } },
            locationRef: { select: { name: true } },
          },
        },
      },
    });

    return {
      data: {
        count: policies.length,
        days,
        policies: policies.map(p => ({
          ...p,
          coverageAmount: Number(p.coverageAmount),
          premium: p.premium ? Number(p.premium) : null,
          daysUntilExpiry: Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
    };
  },
});
