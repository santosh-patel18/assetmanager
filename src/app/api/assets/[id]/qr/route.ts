/**
 * QR Code Generation API — Returns QR code image for an asset
 * 
 * GET /api/assets/:id/qr?format=png|svg&size=200
 * Returns the QR image directly as image/png or image/svg+xml
 */

import { NextResponse } from 'next/server';
import { getCurrentUserFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';
import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromHeader(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, assetTag: true, name: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'png';
  const size = parseInt(url.searchParams.get('size') || '300', 10);
  const qrUrl = `${APP_URL}/scan/${asset.assetTag}`;

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(qrUrl, {
        type: 'svg',
        width: size,
        margin: 1,
        color: { dark: '#ffffff', light: '#00000000' },
      });
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `inline; filename="${asset.assetTag}-qr.svg"`,
        },
      });
    }

    // Default: PNG
    const pngBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: size,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    });
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${asset.assetTag}-qr.png"`,
      },
    });
  } catch (error) {
    console.error('QR generation failed:', error);
    return NextResponse.json({ error: 'QR code generation failed' }, { status: 500 });
  }
}
