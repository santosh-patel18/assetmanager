import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { updateLocationSchema } from '@/lib/validations/locations';
import { logActivity } from '@/lib/activity-logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, type: true, status: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { assets: true } },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Build parent breadcrumb chain
    const breadcrumb: { id: string; name: string; code: string }[] = [];
    let currentId: string | null = location.parentId;
    while (currentId) {
      const parent = await prisma.location.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, code: true, parentId: true },
      });
      if (!parent) break;
      breadcrumb.unshift({ id: parent.id, name: parent.name, code: parent.code });
      currentId = parent.parentId;
    }

    return NextResponse.json({ location, breadcrumb });
  } catch (error) {
    console.error('Get location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateLocationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const data = result.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) {
      // Check code uniqueness (excluding self)
      const codeConflict = await prisma.location.findFirst({
        where: { code: data.code, id: { not: id } },
      });
      if (codeConflict) {
        return NextResponse.json({ error: `Code "${data.code}" already in use` }, { status: 409 });
      }
      updateData.code = data.code;
    }
    if (data.type !== undefined) updateData.type = data.type;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.status !== undefined) updateData.status = data.status;

    // Prevent moving to self or to a descendant (circular reference)
    if (data.parent_id !== undefined) {
      if (data.parent_id === id) {
        return NextResponse.json({ error: 'A location cannot be its own parent' }, { status: 400 });
      }

      if (data.parent_id) {
        // Walk up from the proposed parent to ensure it doesn't lead back to `id`
        let checkId: string | null = data.parent_id;
        while (checkId) {
          if (checkId === id) {
            return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 });
          }
          const parent: { parentId: string | null } | null = await prisma.location.findUnique({
            where: { id: checkId },
            select: { parentId: true },
          });
          checkId = parent?.parentId || null;
        }
      }

      updateData.parentId = data.parent_id;
    }

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { assets: true } },
      },
    });

    await logActivity(user.userId, 'UPDATE_LOCATION', 'location', location.id, {
      name: location.name,
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
