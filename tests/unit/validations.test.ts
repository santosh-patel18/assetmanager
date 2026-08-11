import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth';
import {
  createAssetSchema,
  allocateAssetSchema,
  returnAssetSchema,
  transferRequestSchema,
  validateAttributesAgainstSchema,
} from '@/lib/validations/assets';

// ─── Auth Schemas ────────────────────────────────────────────────

describe('loginSchema', () => {
  it('should accept valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('should reject missing email', () => {
    const result = loginSchema.safeParse({ password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('should accept valid signup data', () => {
    const result = signupSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongP@ss1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = signupSchema.safeParse({ email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('should reject password under 8 chars', () => {
    const result = signupSchema.safeParse({ name: 'Test', email: 'a@b.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('should accept optional department_id', () => {
    const result = signupSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '12345678',
      department_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid department_id (not UUID)', () => {
    const result = signupSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '12345678',
      department_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('should accept valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@test.com' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('should accept valid token and password', () => {
    const result = resetPasswordSchema.safeParse({ token: 'abc123', password: 'NewP@ss1!' });
    expect(result.success).toBe(true);
  });

  it('should reject empty token', () => {
    const result = resetPasswordSchema.safeParse({ token: '', password: '12345678' });
    expect(result.success).toBe(false);
  });
});

// ─── Asset Schemas ───────────────────────────────────────────────

describe('createAssetSchema', () => {
  const validAsset = {
    name: 'MacBook Pro',
    category_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('should accept minimal valid asset', () => {
    const result = createAssetSchema.safeParse(validAsset);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = createAssetSchema.safeParse({ category_id: validAsset.category_id });
    expect(result.success).toBe(false);
  });

  it('should reject missing category_id', () => {
    const result = createAssetSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid category_id (not UUID)', () => {
    const result = createAssetSchema.safeParse({ name: 'Test', category_id: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = createAssetSchema.safeParse({
      ...validAsset,
      serial_number: 'SN-001',
      acquisition_cost: 1999.99,
      condition: 'New',
      location: 'Floor 2',
      is_bookable: true,
      attributes: { ram_gb: 32 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative acquisition cost', () => {
    const result = createAssetSchema.safeParse({ ...validAsset, acquisition_cost: -100 });
    expect(result.success).toBe(false);
  });

  it('should default is_bookable to false', () => {
    const result = createAssetSchema.safeParse(validAsset);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_bookable).toBe(false);
    }
  });
});

describe('allocateAssetSchema', () => {
  it('should accept valid allocation', () => {
    const result = allocateAssetSchema.safeParse({
      target_type: 'employee',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid target_type', () => {
    const result = allocateAssetSchema.safeParse({
      target_type: 'unknown',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(false);
  });

  it('should accept department as target_type', () => {
    const result = allocateAssetSchema.safeParse({
      target_type: 'department',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});

describe('returnAssetSchema', () => {
  it('should accept optional condition notes', () => {
    const result = returnAssetSchema.safeParse({ condition_notes: 'Minor scratches' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = returnAssetSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('transferRequestSchema', () => {
  it('should accept valid transfer request', () => {
    const result = transferRequestSchema.safeParse({
      new_target_type: 'employee',
      new_target_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Attribute Validation ────────────────────────────────────────

describe('validateAttributesAgainstSchema', () => {
  const fieldSchema = {
    brand: { type: 'string', required: true },
    ram_gb: { type: 'number', required: false },
    is_touch: { type: 'boolean', required: false },
  };

  it('should accept valid attributes', () => {
    const result = validateAttributesAgainstSchema(
      { brand: 'Apple', ram_gb: 32, is_touch: false },
      fieldSchema
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing required field', () => {
    const result = validateAttributesAgainstSchema({ ram_gb: 16 }, fieldSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Attribute 'brand' is required");
  });

  it('should reject wrong type (string expected, number given)', () => {
    const result = validateAttributesAgainstSchema({ brand: 123 }, fieldSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Attribute 'brand' must be a string");
  });

  it('should reject wrong type (number expected, string given)', () => {
    const result = validateAttributesAgainstSchema(
      { brand: 'Dell', ram_gb: 'sixteen' },
      fieldSchema
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Attribute 'ram_gb' must be a number");
  });

  it('should reject wrong type (boolean expected, string given)', () => {
    const result = validateAttributesAgainstSchema(
      { brand: 'HP', is_touch: 'yes' },
      fieldSchema
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Attribute 'is_touch' must be a boolean");
  });

  it('should accept optional fields when omitted', () => {
    const result = validateAttributesAgainstSchema({ brand: 'Lenovo' }, fieldSchema);
    expect(result.valid).toBe(true);
  });

  it('should accept empty schema', () => {
    const result = validateAttributesAgainstSchema({ anything: 'goes' }, {});
    expect(result.valid).toBe(true);
  });
});
