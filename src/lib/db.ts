import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaUnscoped: PrismaClient | undefined;
};

/**
 * Prisma client singleton with soft-delete extensions.
 *
 * Soft-deletable models: Department, Employee, Asset
 * - findMany/findFirst/findUnique/count auto-filter deletedAt = null
 * - delete/deleteMany converted to soft-delete (set deletedAt)
 *
 * Use `prismaUnscoped` for queries that explicitly need soft-deleted records
 * (e.g., audit trail, admin recovery).
 */

const SOFT_DELETE_MODELS: Prisma.ModelName[] = ['Department', 'Employee', 'Asset'];

function isSoftDeleteModel(model: string): boolean {
  return SOFT_DELETE_MODELS.includes(model as Prisma.ModelName);
}

function createPrismaClient() {
  const baseClient = new PrismaClient();

  const extended = baseClient.$extends({
    query: {
      $allModels: {
        // ─── Auto-filter soft-deleted records on reads ──────────────
        async findMany({ model, args, query }) {
          const where = args.where as Record<string, unknown> | undefined;
          if (isSoftDeleteModel(model) && where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null } as typeof args.where;
          }
          return query(args);
        },

        async findFirst({ model, args, query }) {
          const where = args.where as Record<string, unknown> | undefined;
          if (isSoftDeleteModel(model) && where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null } as typeof args.where;
          }
          return query(args);
        },

        async findUnique({ model, args, query }) {
          if (isSoftDeleteModel(model) && (args.where as Record<string, unknown>)?.deletedAt === undefined) {
            (args.where as Record<string, unknown>).deletedAt = null;
          }
          return query(args);
        },

        async count({ model, args, query }) {
          const where = args.where as Record<string, unknown> | undefined;
          if (isSoftDeleteModel(model) && where?.deletedAt === undefined) {
            args.where = { ...args.where, deletedAt: null } as typeof args.where;
          }
          return query(args);
        },

        // ─── Convert delete to soft-delete ──────────────────────────
        async delete({ model, args, query }) {
          if (isSoftDeleteModel(model)) {
            // Convert to update with deletedAt timestamp
            return (baseClient as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (isSoftDeleteModel(model)) {
            return (baseClient as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
      },
    },
  });

  return extended;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Unscoped Prisma client — bypasses soft-delete extensions.
 * Use this when you need to access soft-deleted records (e.g., audit trail, admin restore).
 *
 * Usage: const deleted = await prismaUnscoped.employee.findMany({ where: { deletedAt: { not: null } } });
 */
export const prismaUnscoped = globalForPrisma.prismaUnscoped ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaUnscoped = prismaUnscoped;

