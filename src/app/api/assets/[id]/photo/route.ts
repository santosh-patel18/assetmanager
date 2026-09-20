/**
 * Asset Photo Upload API
 * POST /api/assets/:id/photo — Upload asset photo (multipart/form-data)
 */

import { NextResponse } from 'next/server';
import { getCurrentUserFromHeader, verifyRoleFromDB } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromHeader(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await verifyRoleFromDB(user.userId);
  if (!role || !['admin', 'asset_manager'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const asset = await prisma.asset.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, assetTag: true },
  });

  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size: 5MB' }, { status: 400 });
    }

    // Save file
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const filename = `${asset.assetTag.toLowerCase()}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'assets');

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);

    const photoUrl = `/uploads/assets/${filename}`;

    // Update asset record
    await prisma.asset.update({
      where: { id: asset.id },
      data: { photoUrl },
    });

    await logActivity(user.userId, 'PHOTO_UPLOADED', 'asset', asset.id, {
      assetTag: asset.assetTag,
      photoUrl,
    });

    return NextResponse.json({ message: 'Photo uploaded', photoUrl });
  } catch (error) {
    console.error('Photo upload failed:', error);
    return NextResponse.json({ error: 'Photo upload failed' }, { status: 500 });
  }
}
