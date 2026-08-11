import { apiHandler } from '@/lib/api-handler';
import { prisma } from '@/lib/db';

const startedAt = new Date();

export const GET = apiHandler({
  public: true,
  handler: async () => {
    // Check database connectivity
    let dbStatus = 'healthy';
    let dbLatencyMs: number | null = null;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'unhealthy';
    }

    const memUsage = process.memoryUsage();

    return {
      data: {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: {
          startedAt: startedAt.toISOString(),
          uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
        environment: process.env.NODE_ENV || 'development',
      },
      status: dbStatus === 'healthy' ? 200 : 503,
    };
  },
});
