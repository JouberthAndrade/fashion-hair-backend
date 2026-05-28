import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120),
  phone: z.string().min(8, 'Telefone inválido').max(30),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientBody = z.infer<typeof createClientSchema>;
export type UpdateClientBody = z.infer<typeof updateClientSchema>;
