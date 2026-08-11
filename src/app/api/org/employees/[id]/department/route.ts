import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { notify } from '@/lib/notifier';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { departmentId } = body;

    const targetEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });
    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Validate department exists if provided
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: { departmentId: departmentId || null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    await logActivity(user.userId, 'ASSIGN_DEPARTMENT', 'employee', params.id, {
      target_name: targetEmployee.name,
      department: updated.department?.name || 'Unassigned',
    });

    if (updated.department) {
      await notify(
        params.id,
        'DEPARTMENT_CHANGE',
        `You have been assigned to the ${updated.department.name} department.`
      );
    }

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error('Assign department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
