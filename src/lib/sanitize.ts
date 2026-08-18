/**
 * Input sanitization utilities for AssetFlow.
 *
 * Provides defense-in-depth against XSS, injection, and other input-based attacks.
 * Prisma already parameterizes SQL queries, so these utilities focus on:
 * - Sanitizing strings rendered in HTML emails (notifier)
 * - Cleaning search/filter inputs
 * - Stripping dangerous characters from free-text fields
 *
 * Usage:
 *   import { sanitizeHtml, sanitizeSearchInput, stripNullBytes } from '@/lib/sanitize';
 *   const clean = sanitizeHtml(userInput);
 */

// ─── HTML Entity Encoding ───────────────────────────────────────
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

/**
 * Encode HTML special characters to prevent XSS when rendering in HTML contexts.
 * Use this before inserting user-supplied strings into email templates or HTML responses.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] || char);
}

// ─── XSS Sanitization ──────────────────────────────────────────

/** Patterns that indicate XSS payloads */
const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,               // onclick=, onerror=, onload=, etc.
  /<iframe[\s>]/i,
  /<\/iframe>/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<link[\s>]/i,
  /expression\s*\(/i,         // CSS expression()
  /url\s*\(\s*['"]?\s*data:/i, // data: URIs in CSS
  /vbscript\s*:/i,
];


/**
 * Sanitize a string for safe HTML rendering.
 * Strips dangerous tags/attributes and encodes remaining HTML entities.
 *
 * This is NOT a full HTML parser — for rich-text content, use a library like DOMPurify.
 * This is designed for plain-text user inputs (names, descriptions, notes).
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = stripNullBytes(input);

  // Remove script tags and their contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove other dangerous tags (but keep their text content)
  cleaned = cleaned.replace(/<\/?(?:iframe|object|embed|link|style|meta|base|form|input|button|select|textarea)\b[^>]*>/gi, '');

  // Remove event handler attributes from any remaining tags
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: and vbscript: URIs
  cleaned = cleaned.replace(/(?:javascript|vbscript)\s*:/gi, '');

  // Encode remaining HTML entities
  cleaned = escapeHtml(cleaned);

  return cleaned;
}

/**
 * Check if a string contains potential XSS payloads.
 * Returns true if suspicious content is detected.
 */
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

// ─── Null Byte Removal ──────────────────────────────────────────

/**
 * Strip null bytes (\0) and other control characters that can bypass validation.
 * Preserves newlines (\n), tabs (\t), and carriage returns (\r).
 */
export function stripNullBytes(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Remove null bytes and control chars (except \t \n \r)
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ─── Search Input Sanitization ──────────────────────────────────

/**
 * Sanitize search/filter input for safe use in database queries.
 * Strips dangerous characters while preserving normal search terms.
 *
 * Note: Prisma parameterizes queries, so SQL injection via Prisma is not possible.
 * This is an extra defense layer for any raw query usage.
 */
export function sanitizeSearchInput(input: string, maxLength: number = 200): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = stripNullBytes(input.trim());

  // Remove SQL comment sequences
  cleaned = cleaned.replace(/--/g, '');
  cleaned = cleaned.replace(/\/\*/g, '');
  cleaned = cleaned.replace(/\*\//g, '');

  // Remove semicolons (statement terminators)
  cleaned = cleaned.replace(/;/g, '');

  // Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

// ─── String Length Enforcement ───────────────────────────────────

/**
 * Truncate a string to a maximum length, optionally appending an ellipsis.
 */
export function truncate(input: string, maxLength: number, ellipsis: boolean = false): string {
  if (!input || typeof input !== 'string') return '';
  if (input.length <= maxLength) return input;

  if (ellipsis && maxLength > 3) {
    return input.slice(0, maxLength - 3) + '...';
  }
  return input.slice(0, maxLength);
}

// ─── Batch Sanitization ─────────────────────────────────────────

/**
 * Sanitize all string values in a flat object.
 * Useful for cleaning request bodies before processing.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sanitizer: (input: string) => string = sanitizeHtml
): T {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizer(value);
    }
  }
  return result;
}
