import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

// Preço cobrado definido pelo colaborador. Livre, porém > 0 e com até 2 casas.
// A taxa do salão NÃO é aceita aqui — segue exclusiva do ADMIN.
const priceField = z
  .number()
  .positive('Preço deve ser maior que zero')
  .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais');

export const createAppointmentSchema = z.object({
  collaboratorId: z.string().uuid('ID do colaborador inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve estar no formato HH:MM'),
  notes: z.string().max(500).optional(),
  price: priceField.optional(),
  // Client: either existing ID or new client data
  clientId: z.string().uuid().optional(),
  newClient: z
    .object({
      name: z.string().min(2).max(120),
      phone: z.string().min(8).max(30),
      email: z.string().email().optional(),
    })
    .optional(),
}).refine(
  (data) => Boolean(data.clientId) !== Boolean(data.newClient),
  {
    message: 'Informe exatamente um: clientId OU newClient',
    path: ['clientId'],
  },
);

export const updateAppointmentSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  serviceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  price: priceField.optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  // Ajuste opcional do preço final no checkout (ao concluir o atendimento).
  price: priceField.optional(),
});

export type CreateAppointmentBody = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
