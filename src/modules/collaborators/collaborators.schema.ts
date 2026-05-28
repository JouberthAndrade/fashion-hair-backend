import { z } from 'zod';
import { Specialty, DayOfWeek } from '@prisma/client';

export const upsertProfileSchema = z.object({
  specialty: z.nativeEnum(Specialty),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const workingHoursItemSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato inválido HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato inválido HH:MM'),
  isActive: z.boolean().default(true),
});

export const upsertWorkingHoursSchema = z.object({
  workingHours: z.array(workingHoursItemSchema).min(1),
});

export type UpsertProfileBody = z.infer<typeof upsertProfileSchema>;
export type UpsertWorkingHoursBody = z.infer<typeof upsertWorkingHoursSchema>;
