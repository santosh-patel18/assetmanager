/**
 * GET  /api/insurance — List insurance policies (with filters)
 * POST /api/insurance — Create a new insurance policy
 *
 * Access:
 *   GET:  Admin, Finance Manager, Asset Manager, Dept Head (dept-scoped)
 *   POST: Admin, Finance Manager, Asset Manager
 */

import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';
import { EmployeeRole, FINANCIAL_ROLES, FINANCIAL_VIEW_ROLES, ActivityAction } from '@/lib/enums';
import { getDepartmentScope } from '@/lib/auth';
import { createInsurancePolicySchema } from '@/lib/validations/insurance';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { logActivity } from '@/lib/activity-logger';
import { parsePagination } from '@/lib/pagination';

// ─── GET /api/insurance ──────────────────────────────────────────
export const GET = apiHandler({
  roles: [...FINANCIAL_VIEW_ROLES],
  handler: async ({ user, verifiedRole, request }) => {
    const { skip, page, limit } = parsePagination(request);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const assetId = url.searchParams.get('assetId');
    const search = url.searchParams.get('search');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (assetId) where.assetId = assetId;
    if (search) {
      where.OR = [
        { policyNumber: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { asset: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Dept Head scoping — only their department's assets
    if (verifiedRole === EmployeeRole.DEPARTMENT_HEAD) {
      const deptScope = await getDepartmentScope(user!.userId);
      where.asset = { ...(where.asset as object || {}), departmentId: { in: deptScope } };
    }

    const [policies, total] = await Promise.all([
      prisma.insurancePolicy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { endDate: 'asc' },
        include: {
          asset: {
            select: { id: true, name: true, assetTag: true, departmentId: true,
              department: { select: { name: true } },
              locationRef: { select: { name: true } },
            },
          },
        },
      }),
      prisma.insurancePolicy.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: {
        data: policies.map(p => ({
          ...p,
          coverageAmount: Number(p.coverageAmount),
          premium: p.premium ? Number(p.premium) : null,
        })),
        pagination: {
          page, limit, total, totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  },
});

// ─── POST /api/insurance ─────────────────────────────────────────
export const POST = apiHandler({
  roles: [...FINANCIAL_ROLES],
  handler: async ({ user, body, log }) => {
    const parsed = createInsurancePolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findFirst({
      where: { id: parsed.data.assetId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!asset) throw new NotFoundError('Asset');

    const policy = await prisma.insurancePolicy.create({
      data: {
        assetId: parsed.data.assetId,
        policyNumber: parsed.data.policyNumber,
        provider: parsed.data.provider,
        coverageAmount: parsed.data.coverageAmount,
        premium: parsed.data.premium ?? null,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });

    await logActivity(
      user!.userId,
      ActivityAction.INSURANCE_CREATED,
      'insurance_policy',
      policy.id,
      { assetId: parsed.data.assetId, policyNumber: parsed.data.policyNumber }
    );

    log.info('Insurance policy created', { policyId: policy.id, assetId: parsed.data.assetId });

    return {
      data: {
        ...policy,
        coverageAmount: Number(policy.coverageAmount),
        premium: policy.premium ? Number(policy.premium) : null,
      },
      status: 201,
    };
  },
});
