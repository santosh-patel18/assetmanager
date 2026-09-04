import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeader } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromHeader(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    // Get bookings from last 30 days, optionally filtered by resource location
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookingWhere: Record<string, unknown> = {
      startTime: { gte: thirtyDaysAgo },
      status: { not: 'Cancelled' },
    };
    if (locationId) {
      bookingWhere.resource = { locationId };
    }

    const bookings = await prisma.resourceBooking.findMany({
      where: bookingWhere,
      select: { startTime: true, endTime: true, resourceId: true },
    });

    // Build heatmap data: hour (0-23) x day (0-6)
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const b of bookings) {
      const start = new Date(b.startTime);
      const day = start.getDay();
      const hour = start.getHours();
      heatmap[day][hour]++;
    }

    // Peak hours
    const hourCounts = Array(24).fill(0);
    for (const b of bookings) {
      const hour = new Date(b.startTime).getHours();
      hourCounts[hour]++;
    }

    return NextResponse.json({ heatmap, hourCounts, totalBookings: bookings.length });
  } catch (error) {
    console.error('Booking heatmap report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
