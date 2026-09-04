import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

/**
 * GET /api/allocations
 *
 * Returns allocations with resolved target names (employee/department).
 * Fixes the N+1 problem where the frontend was making 100+ individual API calls.
 *
 * Query params:
 *   ?status=Active|Returned (default: all)
 *   ?page=1&limit=20
 *   ?search=term (searches asset name, asset tag)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.asset = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { assetTag: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [allocations, total] = await Promise.all([
      prisma.allocation.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              status: true,
              category: { select: { id: true, name: true } },
            },
          },
          allocator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.allocation.count({ where }),
    ]);

    // Resolve target names in bulk
    const employeeTargetIds = allocations
      .filter(a => a.targetType === 'employee')
      .map(a => a.targetId);
    const departmentTargetIds = allocations
      .filter(a => a.targetType === 'department')
      .map(a => a.targetId);

    const [employees, departments] = await Promise.all([
      employeeTargetIds.length > 0
        ? prisma.employee.findMany({
            where: { id: { in: employeeTargetIds } },
            select: { id: true, name: true, email: true },
          })
        : [],
      departmentTargetIds.length > 0
        ? prisma.department.findMany({
            where: { id: { in: departmentTargetIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const employeeMap = new Map(employees.map(e => [e.id, e.name]));
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));

    const enrichedAllocations = allocations.map(alloc => ({
      ...alloc,
      targetName:
        alloc.targetType === 'employee'
          ? employeeMap.get(alloc.targetId) || 'Unknown Employee'
          : departmentMap.get(alloc.targetId) || 'Unknown Department',
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      allocations: enrichedAllocations,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  } catch (error) {
    console.error('Get allocations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
