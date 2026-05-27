import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120),
  description: z.string().max(500).optional(),
  durationMin: z
    .number()
    .int()
    .min(5, 'Duração mínima é 5 minutos')
    .max(480, 'Duração máxima é 480 minutos'),
  price: z.number().positive('Preço deve ser positivo'),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateServiceBody = z.infer<typeof createServiceSchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceSchema>;
