import type { Specialty } from '@prisma/client';

type ServiceLike = { name: string; specialty?: Specialty | null };

/** Fallback when Service.specialty is not set in the database. */
const NAME_RULES: { pattern: RegExp; specialty: Specialty }[] = [
  { pattern: /manicure/i, specialty: 'MANICURE' },
  { pattern: /pedicure/i, specialty: 'PEDICURE' },
  { pattern: /sobrancelha/i, specialty: 'EYEBROW' },
  { pattern: /maquiagem/i, specialty: 'MAKEUP_ARTIST' },
  { pattern: /est[eé]tica|depila|limpeza de pele/i, specialty: 'AESTHETICIAN' },
  { pattern: /corte|colora|escova|hidrata|progressiva|penteado|luzes|balayage/i, specialty: 'HAIRDRESSER' },
];

/** Which collaborator specialties can perform a service of the given type. */
export const COMPATIBLE_COLLABORATOR_SPECIALTIES: Record<Specialty, Specialty[]> = {
  HAIRDRESSER: ['HAIRDRESSER'],
  MANICURE: ['MANICURE'],
  PEDICURE: ['PEDICURE', 'MANICURE'],
  MAKEUP_ARTIST: ['MAKEUP_ARTIST'],
  EYEBROW: ['EYEBROW'],
  AESTHETICIAN: ['AESTHETICIAN'],
};

export function inferServiceSpecialtyFromName(name: string): Specialty | null {
  for (const rule of NAME_RULES) {
    if (rule.pattern.test(name)) return rule.specialty;
  }
  return null;
}

export function resolveServiceSpecialty(service: ServiceLike): Specialty | null {
  return service.specialty ?? inferServiceSpecialtyFromName(service.name);
}

export function collaboratorMatchesService(
  collaboratorSpecialty: Specialty | null | undefined,
  service: ServiceLike,
): boolean {
  if (!collaboratorSpecialty) return false;
  const required = resolveServiceSpecialty(service);
  if (!required) return true;
  const allowed = COMPATIBLE_COLLABORATOR_SPECIALTIES[required];
  return allowed.includes(collaboratorSpecialty);
}
