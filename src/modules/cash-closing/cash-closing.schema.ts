import { z } from 'zod';

export const reportQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
});

export const updateSettingsSchema = z.object({
  defaultSalonFeeRatePercent: z
    .number()
    .min(0, 'Taxa mínima é 0%')
    .max(100, 'Taxa máxima é 100%'),
});

export const updateServiceFeeSchema = z.object({
  salonFeeRatePercent: z
    .number()
    .min(0)
    .max(100)
    .nullable(),
});

export const closeCashSchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
export type UpdateServiceFeeBody = z.infer<typeof updateServiceFeeSchema>;
export type CloseCashBody = z.infer<typeof closeCashSchema>;
