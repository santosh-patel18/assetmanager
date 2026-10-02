import { z } from 'zod';

// ─── Asset Financial Fields ──────────────────────────────────────

export const updateAssetFinancialsSchema = z.object({
  purchaseOrderNumber: z.string().max(100).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  supplier: z.string().max(255).optional().nullable(),
  depreciationMethod: z.enum(['straight_line', 'declining_balance', 'sum_of_years']).optional().nullable(),
  usefulLifeMonths: z.number().int().min(1).max(600).optional().nullable(), // max 50 years
  salvageValue: z.number().min(0).optional().nullable(),
  warrantyEndDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
});

export type UpdateAssetFinancialsInput = z.infer<typeof updateAssetFinancialsSchema>;

// ─── Depreciation Calculation Request ────────────────────────────

export const calculateDepreciationSchema = z.object({
  /** Override method (uses asset's configured method if not specified) */
  method: z.enum(['straight_line', 'declining_balance', 'sum_of_years']).optional(),
  /** Override useful life (uses asset's configured value if not specified) */
  usefulLifeMonths: z.number().int().min(1).max(600).optional(),
  /** Override salvage value (uses asset's configured value if not specified) */
  salvageValue: z.number().min(0).optional(),
});

export type CalculateDepreciationInput = z.infer<typeof calculateDepreciationSchema>;
