import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  collaboratorId: z.string().uuid('ID do colaborador inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
});

export const createPublicAppointmentSchema = z.object({
  collaboratorId: z.string().uuid('ID do colaborador inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve estar no formato HH:MM'),
  client: z.object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
    phone: z.string().min(8, 'Telefone inválido').max(30),
    email: z.string().email('E-mail inválido'),
  }),
  privacyConsent: z.literal(true, {
    message: 'É necessário aceitar a Política de Privacidade',
  }),
  marketingOptIn: z.boolean().default(false),
  /** Honeypot — must stay empty; bots often fill hidden fields. */
  website: z.string().max(0).optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CreatePublicAppointmentBody = z.infer<typeof createPublicAppointmentSchema>;

export const listCollaboratorsQuerySchema = z.object({
  serviceId: z.string().uuid('ID do serviço inválido'),
});

export type ListCollaboratorsQuery = z.infer<typeof listCollaboratorsQuerySchema>;
