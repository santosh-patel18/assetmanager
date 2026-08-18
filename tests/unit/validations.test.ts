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

// ─── Booking Schemas (Phase 3) ──────────────────────────────────

import {
  createBookingSchema,
  cancelBookingSchema,
} from '@/lib/validations/bookings';

describe('createBookingSchema', () => {
  const validBooking = {
    resource_id: '123e4567-e89b-12d3-a456-426614174000',
    start_time: '2026-09-01T09:00:00Z',
    end_time: '2026-09-01T10:00:00Z',
  };

  it('should accept valid booking', () => {
    const result = createBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('should reject missing resource_id', () => {
    const { resource_id, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid resource_id (not UUID)', () => {
    const result = createBookingSchema.safeParse({ ...validBooking, resource_id: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should reject missing start_time', () => {
    const { start_time, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject missing end_time', () => {
    const { end_time, ...rest } = validBooking;
    const result = createBookingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject end_time before start_time', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      start_time: '2026-09-01T10:00:00Z',
      end_time: '2026-09-01T09:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional department_id', () => {
    const result = createBookingSchema.safeParse({
      ...validBooking,
      department_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});

describe('cancelBookingSchema', () => {
  it('should accept optional reason', () => {
    const result = cancelBookingSchema.safeParse({ reason: 'Meeting cancelled' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = cancelBookingSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── Maintenance Schemas (Phase 3) ──────────────────────────────

import {
  createMaintenanceSchema,
  assignTechnicianSchema,
} from '@/lib/validations/maintenance';

describe('createMaintenanceSchema', () => {
  const validRequest = {
    asset_id: '123e4567-e89b-12d3-a456-426614174000',
    issue: 'Screen flickering intermittently',
    priority: 'high' as const,
  };

  it('should accept valid maintenance request', () => {
    const result = createMaintenanceSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject missing asset_id', () => {
    const { asset_id, ...rest } = validRequest;
    const result = createMaintenanceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid asset_id (not UUID)', () => {
    const result = createMaintenanceSchema.safeParse({ ...validRequest, asset_id: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should reject missing issue', () => {
    const { issue, ...rest } = validRequest;
    const result = createMaintenanceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject empty issue', () => {
    const result = createMaintenanceSchema.safeParse({ ...validRequest, issue: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid priority', () => {
    const result = createMaintenanceSchema.safeParse({ ...validRequest, priority: 'critical' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid priority values', () => {
    for (const priority of ['low', 'medium', 'high']) {
      const result = createMaintenanceSchema.safeParse({ ...validRequest, priority });
      expect(result.success).toBe(true);
    }
  });

  it('should accept optional photo_url', () => {
    const result = createMaintenanceSchema.safeParse({ ...validRequest, photo_url: 'https://img.example.com/photo.jpg' });
    expect(result.success).toBe(true);
  });
});

describe('assignTechnicianSchema', () => {
  it('should accept valid technician name', () => {
    const result = assignTechnicianSchema.safeParse({ technician: 'John Smith' });
    expect(result.success).toBe(true);
  });

  it('should reject empty technician name', () => {
    const result = assignTechnicianSchema.safeParse({ technician: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing technician field', () => {
    const result = assignTechnicianSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Audit Schemas (Phase 3) ────────────────────────────────────

import {
  createAuditCycleSchema,
  markAuditItemSchema,
  closeAuditCycleSchema,
} from '@/lib/validations/audit';

describe('createAuditCycleSchema', () => {
  const validAudit = {
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    auditor_ids: ['123e4567-e89b-12d3-a456-426614174000'],
  };

  it('should accept valid audit cycle', () => {
    const result = createAuditCycleSchema.safeParse(validAudit);
    expect(result.success).toBe(true);
  });

  it('should reject missing start_date', () => {
    const { start_date, ...rest } = validAudit;
    const result = createAuditCycleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject missing end_date', () => {
    const { end_date, ...rest } = validAudit;
    const result = createAuditCycleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject empty auditor_ids array', () => {
    const result = createAuditCycleSchema.safeParse({ ...validAudit, auditor_ids: [] });
    expect(result.success).toBe(false);
  });

  it('should reject invalid auditor UUID', () => {
    const result = createAuditCycleSchema.safeParse({ ...validAudit, auditor_ids: ['not-a-uuid'] });
    expect(result.success).toBe(false);
  });

  it('should accept optional scope fields', () => {
    const result = createAuditCycleSchema.safeParse({
      ...validAudit,
      scope_department_id: '123e4567-e89b-12d3-a456-426614174000',
      scope_location: 'Building A',
    });
    expect(result.success).toBe(true);
  });
});

describe('markAuditItemSchema', () => {
  it('should accept Verified result', () => {
    expect(markAuditItemSchema.safeParse({ result: 'Verified' }).success).toBe(true);
  });

  it('should accept Missing result', () => {
    expect(markAuditItemSchema.safeParse({ result: 'Missing' }).success).toBe(true);
  });

  it('should accept Damaged result', () => {
    expect(markAuditItemSchema.safeParse({ result: 'Damaged' }).success).toBe(true);
  });

  it('should reject invalid result value', () => {
    expect(markAuditItemSchema.safeParse({ result: 'Lost' }).success).toBe(false);
  });
});

describe('closeAuditCycleSchema', () => {
  it('should accept empty resolutions', () => {
    const result = closeAuditCycleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid resolutions', () => {
    const result = closeAuditCycleSchema.safeParse({
      resolutions: [
        { asset_id: '123e4567-e89b-12d3-a456-426614174000', action: 'mark_lost' },
        { asset_id: '223e4567-e89b-12d3-a456-426614174000', action: 'mark_available' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid resolution action', () => {
    const result = closeAuditCycleSchema.safeParse({
      resolutions: [
        { asset_id: '123e4567-e89b-12d3-a456-426614174000', action: 'destroy' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid resolution actions', () => {
    for (const action of ['mark_lost', 'mark_available', 'no_change']) {
      const result = closeAuditCycleSchema.safeParse({
        resolutions: [{ asset_id: '123e4567-e89b-12d3-a456-426614174000', action }],
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Org Schemas (Phase 3) ──────────────────────────────────────

import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createCategorySchema,
  changeRoleSchema,
} from '@/lib/validations/org';

describe('createDepartmentSchema', () => {
  it('should accept valid department', () => {
    const result = createDepartmentSchema.safeParse({ name: 'Engineering' });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = createDepartmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createDepartmentSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept optional parent and head fields', () => {
    const result = createDepartmentSchema.safeParse({
      name: 'Frontend',
      parent_department_id: '123e4567-e89b-12d3-a456-426614174000',
      head_employee_id: '223e4567-e89b-12d3-a456-426614174000',
      status: 'Active',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status value', () => {
    const result = createDepartmentSchema.safeParse({ name: 'Test', status: 'Archived' });
    expect(result.success).toBe(false);
  });
});

describe('updateDepartmentSchema', () => {
  it('should accept partial update', () => {
    const result = updateDepartmentSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (no changes)', () => {
    const result = updateDepartmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('createCategorySchema', () => {
  it('should accept valid category', () => {
    const result = createCategorySchema.safeParse({ name: 'Laptops' });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = createCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept optional field_schema', () => {
    const result = createCategorySchema.safeParse({
      name: 'Laptops',
      field_schema: { brand: { type: 'string', required: true } },
    });
    expect(result.success).toBe(true);
  });
});

describe('changeRoleSchema', () => {
  it('should accept all valid roles', () => {
    for (const role of ['employee', 'department_head', 'asset_manager', 'admin']) {
      const result = changeRoleSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid role', () => {
    const result = changeRoleSchema.safeParse({ role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('should reject missing role', () => {
    const result = changeRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
