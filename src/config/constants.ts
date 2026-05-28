export const CACHE_TTL_SECONDS = 120; // 2 minutes for dashboard cache

export const CACHE_KEYS = {
  DAILY_DASHBOARD: (date: string) => `DAILY_DASHBOARD:${date}`,
} as const;

export const SPECIALTY_LABELS: Record<string, string> = {
  HAIRDRESSER: 'Cabelereiro(a)',
  MANICURE: 'Manicure',
  PEDICURE: 'Pedicure',
  MAKEUP_ARTIST: 'Maquiador(a)',
  EYEBROW: 'Design de Sobrancelha',
  AESTHETICIAN: 'Esteticista',
};

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['DONE', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
  NO_SHOW: [],
};
