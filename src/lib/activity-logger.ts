import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { logger } from './logger';
import type { ActivityAction } from './enums';

export async function logActivity(
  actorId: string,
  action: ActivityAction | string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
  requestId?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        metadata: metadata
          ? (metadata as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        requestId: requestId ?? null,
      },
    });
  } catch (error) {
    // Activity logging should never crash the request — log and move on
    logger.error('Failed to write activity log', {
      error: error instanceof Error ? error : { message: String(error) },
      actorId,
      action,
      targetType,
      targetId,
    });
  }
}
