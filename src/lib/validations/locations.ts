import { z } from 'zod';

const LOCATION_TYPES = ['HQ', 'Region', 'City', 'Building', 'Floor', 'Room', 'Zone'] as const;

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().min(1, 'Code is required').max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must be alphanumeric with hyphens/underscores'),
  type: z.enum(LOCATION_TYPES),
  parent_id: z.string().uuid().optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must be alphanumeric with hyphens/underscores')
    .optional(),
  type: z.enum(LOCATION_TYPES).optional(),
  parent_id: z.string().uuid().optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export { LOCATION_TYPES };
