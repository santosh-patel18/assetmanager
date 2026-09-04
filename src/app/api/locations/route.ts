import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { createLocationSchema } from '@/lib/validations/locations';
import { logActivity } from '@/lib/activity-logger';

const MAX_DEPTH = 7;

/**
 * Check the depth of a location in the hierarchy.
 * Returns the depth (1-based) of the given parent, or 0 if parentId is null.
 */
async function getLocationDepth(parentId: string | null): Promise<number> {
  if (!parentId) return 0;

  let depth = 0;
  let currentId: string | null = parentId;

  while (currentId && depth < MAX_DEPTH + 1) {
    const loc: { parentId: string | null } | null = await prisma.location.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!loc) break;
    depth++;
    currentId = loc.parentId;
  }

  return depth;
}

/**
 * Build a nested tree from a flat list of locations.
 */
interface LocationFlat {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}

interface LocationTree extends LocationFlat {
  children: LocationTree[];
}

function buildTree(items: LocationFlat[], parentId: string | null = null): LocationTree[] {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tree = searchParams.get('tree') === 'true';

    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assets: true } },
      },
    });

    if (tree) {
      return NextResponse.json({ locations: buildTree(locations) });
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbRole = await verifyRoleFromDB(user.userId);
    if (dbRole !== 'admin' && dbRole !== 'asset_manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Asset Manager only' }, { status: 403 });
    }

    const body = await request.json();
    const result = createLocationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;

    // Check code uniqueness
    const existing = await prisma.location.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json({ error: `Location code "${data.code}" already exists` }, { status: 409 });
    }

    // Validate parent exists and check depth
    if (data.parent_id) {
      const parent = await prisma.location.findUnique({ where: { id: data.parent_id } });
      if (!parent) {
        return NextResponse.json({ error: 'Parent location not found' }, { status: 404 });
      }

      const parentDepth = await getLocationDepth(data.parent_id);
      if (parentDepth >= MAX_DEPTH - 1) {
        return NextResponse.json(
          { error: `Maximum hierarchy depth of ${MAX_DEPTH} levels exceeded` },
          { status: 400 }
        );
      }
    }

    const location = await prisma.location.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        parentId: data.parent_id || null,
        address: data.address || null,
      },
      include: { _count: { select: { assets: true } } },
    });

    await logActivity(user.userId, 'CREATE_LOCATION', 'location', location.id, {
      name: location.name,
      code: location.code,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
