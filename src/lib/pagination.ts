/**
 * Shared pagination utility for AssetFlow API list endpoints.
 *
 * Supports offset-based pagination with standardized response shape.
 *
 * Usage in API routes:
 *   const { page, limit, skip } = parsePagination(request);
 *   const [items, total] = await Promise.all([
 *     prisma.asset.findMany({ skip, take: limit, where: ... }),
 *     prisma.asset.count({ where: ... }),
 *   ]);
 *   return paginatedResponse(items, total, page, limit);
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Parse pagination query params from a Request URL.
 * Handles edge cases: negative values, NaN, exceeding max limit.
 */
export function parsePagination(request: Request): PaginationParams {
  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get('page') || '', 10);
  const rawLimit = parseInt(url.searchParams.get('limit') || '', 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Build a standardized paginated response.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Parse a search query param and build a Prisma-compatible search filter.
 * Returns undefined if no search term is provided.
 *
 * Usage:
 *   const searchFilter = parseSearchFilter(request, ['name', 'email', 'assetTag']);
 *   // Returns: { OR: [{ name: { contains: 'term', mode: 'insensitive' } }, ...] }
 */
export function parseSearchFilter(
  request: Request,
  searchableFields: string[]
): Record<string, unknown> | undefined {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim();

  if (!search || searchableFields.length === 0) return undefined;

  return {
    OR: searchableFields.map(field => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
}

/**
 * Parse sort query params.
 * Returns a Prisma-compatible orderBy object.
 *
 * Usage:
 *   const orderBy = parseSortParams(request, ['name', 'createdAt', 'status'], 'createdAt');
 *   // With ?sort=name&order=asc → { name: 'asc' }
 */
export function parseSortParams(
  request: Request,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') || defaultField;
  const order = (url.searchParams.get('order') || defaultOrder) as 'asc' | 'desc';

  // Validate sort field
  const field = allowedFields.includes(sort) ? sort : defaultField;
  const direction = ['asc', 'desc'].includes(order) ? order : defaultOrder;

  return { [field]: direction };
}
