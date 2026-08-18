import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeHtml,
  containsXSS,
  stripNullBytes,
  sanitizeSearchInput,
  truncate,
  sanitizeObject,
} from '@/lib/sanitize';

// ─── escapeHtml ─────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('should encode HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should encode ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should encode single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('should encode backticks', () => {
    expect(escapeHtml('`code`')).toBe('&#96;code&#96;');
  });

  it('should leave normal text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

// ─── sanitizeHtml ───────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('should strip script tags and their contents', () => {
    const result = sanitizeHtml('Hello <script>alert("xss")</script> World');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should strip iframe tags', () => {
    const result = sanitizeHtml('<iframe src="evil.com"></iframe>');
    expect(result).not.toContain('iframe');
  });

  it('should strip object/embed tags', () => {
    const input = '<object data="evil.swf"></object><embed src="evil">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<embed');
  });

  it('should remove event handler attributes', () => {
    const result = sanitizeHtml('<div onclick="alert(1)">click me</div>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
  });

  it('should remove javascript: URIs', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('should remove vbscript: URIs', () => {
    const result = sanitizeHtml('vbscript:msgbox("xss")');
    expect(result).not.toContain('vbscript:');
  });

  it('should strip null bytes', () => {
    const result = sanitizeHtml('hello\x00world');
    expect(result).not.toContain('\x00');
    expect(result).toContain('helloworld');
  });

  it('should return empty string for null/undefined input', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('should leave normal text intact (with HTML encoding)', () => {
    const result = sanitizeHtml('Meeting room booking confirmed');
    expect(result).toBe('Meeting room booking confirmed');
  });
});

// ─── containsXSS ───────────────────────────────────────────────

describe('containsXSS', () => {
  it('should detect script tags', () => {
    expect(containsXSS('<script>alert(1)</script>')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(containsXSS('"><img onerror=alert(1)>')).toBe(true);
  });

  it('should detect javascript: URIs', () => {
    expect(containsXSS('javascript:alert(1)')).toBe(true);
  });

  it('should detect case-insensitive XSS', () => {
    expect(containsXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    expect(containsXSS('JAVASCRIPT:alert(1)')).toBe(true);
  });

  it('should detect iframe injection', () => {
    expect(containsXSS('<iframe src="evil.com">')).toBe(true);
  });

  it('should return false for safe strings', () => {
    expect(containsXSS('Hello World')).toBe(false);
    expect(containsXSS('MacBook Pro 16"')).toBe(false);
    expect(containsXSS('user@example.com')).toBe(false);
  });

  it('should return false for empty/null input', () => {
    expect(containsXSS('')).toBe(false);
    expect(containsXSS(null as unknown as string)).toBe(false);
  });
});

// ─── stripNullBytes ─────────────────────────────────────────────

describe('stripNullBytes', () => {
  it('should remove null bytes', () => {
    expect(stripNullBytes('hello\x00world')).toBe('helloworld');
  });

  it('should remove other control characters', () => {
    expect(stripNullBytes('test\x01\x02\x03data')).toBe('testdata');
  });

  it('should preserve newlines and tabs', () => {
    expect(stripNullBytes('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });

  it('should preserve carriage returns', () => {
    expect(stripNullBytes('line1\r\nline2')).toBe('line1\r\nline2');
  });

  it('should return empty for null/undefined', () => {
    expect(stripNullBytes(null as unknown as string)).toBe('');
    expect(stripNullBytes(undefined as unknown as string)).toBe('');
  });
});

// ─── sanitizeSearchInput ────────────────────────────────────────

describe('sanitizeSearchInput', () => {
  it('should pass through normal search terms', () => {
    expect(sanitizeSearchInput('laptop')).toBe('laptop');
    expect(sanitizeSearchInput('MacBook Pro')).toBe('MacBook Pro');
  });

  it('should trim whitespace', () => {
    expect(sanitizeSearchInput('  search term  ')).toBe('search term');
  });

  it('should remove SQL comment sequences (--)', () => {
    expect(sanitizeSearchInput("admin'--")).toBe("admin'");
  });

  it('should remove block comment sequences (/* */)', () => {
    expect(sanitizeSearchInput('admin/* comment */value')).toBe('admin comment value');
  });

  it('should remove semicolons', () => {
    expect(sanitizeSearchInput('value; DROP TABLE assets')).toBe('value DROP TABLE assets');
  });

  it('should enforce max length', () => {
    const long = 'a'.repeat(300);
    const result = sanitizeSearchInput(long, 200);
    expect(result.length).toBe(200);
  });

  it('should use custom max length', () => {
    const result = sanitizeSearchInput('hello world', 5);
    expect(result).toBe('hello');
  });

  it('should return empty for null/undefined', () => {
    expect(sanitizeSearchInput(null as unknown as string)).toBe('');
    expect(sanitizeSearchInput('')).toBe('');
  });

  it('should strip null bytes from search input', () => {
    expect(sanitizeSearchInput('search\x00term')).toBe('searchterm');
  });
});

// ─── truncate ───────────────────────────────────────────────────

describe('truncate', () => {
  it('should return input unchanged if under max length', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('should truncate at max length', () => {
    expect(truncate('abcdefgh', 5)).toBe('abcde');
  });

  it('should add ellipsis when requested', () => {
    expect(truncate('abcdefgh', 6, true)).toBe('abc...');
  });

  it('should not add ellipsis if string fits', () => {
    expect(truncate('abc', 10, true)).toBe('abc');
  });

  it('should handle max length <= 3 without ellipsis', () => {
    expect(truncate('abcdefgh', 3, true)).toBe('abc');
  });

  it('should return empty for null/undefined', () => {
    expect(truncate(null as unknown as string, 100)).toBe('');
  });
});

// ─── sanitizeObject ─────────────────────────────────────────────

describe('sanitizeObject', () => {
  it('should sanitize all string values', () => {
    const obj = { name: '<script>evil</script>', count: 42, active: true };
    const result = sanitizeObject(obj);
    expect(result.name).not.toContain('<script>');
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('should use custom sanitizer when provided', () => {
    const obj = { value: '  padded  ' };
    const result = sanitizeObject(obj, (s) => s.trim());
    expect(result.value).toBe('padded');
  });

  it('should not mutate the original object', () => {
    const original = { name: '<b>bold</b>' };
    const result = sanitizeObject(original);
    expect(original.name).toBe('<b>bold</b>');
    expect(result.name).not.toBe(original.name);
  });
});
