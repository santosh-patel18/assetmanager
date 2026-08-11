import { describe, it, expect } from 'vitest';
import {
  parsePagination,
  paginatedResponse,
  parseSearchFilter,
  parseSortParams,
} from '@/lib/pagination';

// ─── parsePagination ─────────────────────────────────────────────

describe('parsePagination', () => {
  function mockRequest(url: string): Request {
    return new Request(url);
  }

  it('should return defaults when no params are provided', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets'));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('should parse page and limit from query params', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?page=3&limit=10'));
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('should cap limit at MAX_LIMIT (100)', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?limit=500'));
    expect(result.limit).toBe(100);
  });

  it('should handle negative page values', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?page=-1'));
    expect(result.page).toBe(1);
  });

  it('should handle zero page', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?page=0'));
    expect(result.page).toBe(1);
  });

  it('should handle non-numeric values', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?page=abc&limit=xyz'));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should calculate skip correctly for page 5 with limit 25', () => {
    const result = parsePagination(mockRequest('http://localhost/api/assets?page=5&limit=25'));
    expect(result.skip).toBe(100);
  });
});

// ─── paginatedResponse ───────────────────────────────────────────

describe('paginatedResponse', () => {
  it('should return correct pagination metadata', () => {
    const result = paginatedResponse(['a', 'b', 'c'], 50, 1, 20);
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPreviousPage).toBe(false);
  });

  it('should report hasNextPage=false on last page', () => {
    const result = paginatedResponse(['x'], 41, 3, 20);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPreviousPage).toBe(true);
  });

  it('should handle empty results', () => {
    const result = paginatedResponse([], 0, 1, 20);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPreviousPage).toBe(false);
  });

  it('should handle single page', () => {
    const result = paginatedResponse([1, 2, 3], 3, 1, 20);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPreviousPage).toBe(false);
  });
});

// ─── parseSearchFilter ───────────────────────────────────────────

describe('parseSearchFilter', () => {
  function mockRequest(url: string): Request {
    return new Request(url);
  }

  it('should return undefined when no search param is provided', () => {
    const result = parseSearchFilter(mockRequest('http://localhost/api/assets'), ['name']);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty search string', () => {
    const result = parseSearchFilter(mockRequest('http://localhost/api/assets?search='), ['name']);
    expect(result).toBeUndefined();
  });

  it('should return undefined for whitespace-only search', () => {
    const result = parseSearchFilter(mockRequest('http://localhost/api/assets?search=   '), ['name']);
    expect(result).toBeUndefined();
  });

  it('should build OR filter for multiple searchable fields', () => {
    const result = parseSearchFilter(
      mockRequest('http://localhost/api/assets?search=laptop'),
      ['name', 'assetTag', 'serialNumber']
    );
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).OR).toHaveLength(3);
  });

  it('should use case-insensitive contains mode', () => {
    const result = parseSearchFilter(
      mockRequest('http://localhost/api/assets?search=Dell'),
      ['name']
    ) as Record<string, unknown>;
    const orArray = result.OR as Record<string, unknown>[];
    expect(orArray[0]).toEqual({
      name: { contains: 'Dell', mode: 'insensitive' },
    });
  });
});

// ─── parseSortParams ─────────────────────────────────────────────

describe('parseSortParams', () => {
  function mockRequest(url: string): Request {
    return new Request(url);
  }

  it('should return default sort when no params', () => {
    const result = parseSortParams(
      mockRequest('http://localhost/api/assets'),
      ['name', 'createdAt']
    );
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should parse sort and order params', () => {
    const result = parseSortParams(
      mockRequest('http://localhost/api/assets?sort=name&order=asc'),
      ['name', 'createdAt']
    );
    expect(result).toEqual({ name: 'asc' });
  });

  it('should fall back to default for disallowed sort field', () => {
    const result = parseSortParams(
      mockRequest('http://localhost/api/assets?sort=password'),
      ['name', 'createdAt']
    );
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should fall back to default for invalid order', () => {
    const result = parseSortParams(
      mockRequest('http://localhost/api/assets?sort=name&order=random'),
      ['name', 'createdAt'],
      'createdAt',
      'desc'
    );
    expect(result).toEqual({ name: 'desc' });
  });
});
