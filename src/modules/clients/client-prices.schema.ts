import { z } from 'zod';

export const upsertClientPriceSchema = z.object({
  price: z
    .number()
    .positive('Preço deve ser maior que zero')
    .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais'),
});

export type UpsertClientPriceBody = z.infer<typeof upsertClientPriceSchema>;
