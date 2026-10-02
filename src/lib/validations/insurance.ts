import { z } from 'zod';

// ─── Insurance Policy ────────────────────────────────────────────

export const createInsurancePolicySchema = z.object({
  assetId: z.string().uuid(),
  policyNumber: z.string().min(1).max(100),
  provider: z.string().min(1).max(255),
  coverageAmount: z.number().positive(),
  premium: z.number().min(0).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

export type CreateInsurancePolicyInput = z.infer<typeof createInsurancePolicySchema>;

export const updateInsurancePolicySchema = z.object({
  policyNumber: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(255).optional(),
  coverageAmount: z.number().positive().optional(),
  premium: z.number().min(0).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['Active', 'Expired', 'Cancelled']).optional(),
});

export type UpdateInsurancePolicyInput = z.infer<typeof updateInsurancePolicySchema>;
