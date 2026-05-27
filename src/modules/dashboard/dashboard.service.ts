import { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../../config/constants.js';

export async function getDailyDashboardService(
  prisma: PrismaClient,
  redis: Redis,
  date: string,
) {
  const cacheKey = CACHE_KEYS.DAILY_DASHBOARD(date);

  // Try cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { data: JSON.parse(cached) as object, fromCache: true };
    }
  } catch {
    // Redis unavailable — proceed without cache
  }

  const scheduledDate = new Date(`${date}T00:00:00`);

  // Get all active collaborators
  const collaborators = await prisma.user.findMany({
    where: { role: 'COLLABORATOR', isActive: true, deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      collaboratorProfile: {
        select: { specialty: true, avatarUrl: true },
      },
    },
  });

  // Get all appointments for the day
  const appointments = await prisma.appointment.findMany({
    where: { scheduledDate, deletedAt: null },
    orderBy: [{ collaboratorId: 'asc' }, { startTime: 'asc' }],
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      collaborator: { select: { id: true, name: true } },
    },
  });

  // Group appointments by collaborator
  const appointmentsByCollaborator = appointments.reduce<
    Record<string, typeof appointments>
  >((acc, appt) => {
    if (!acc[appt.collaboratorId]) {
      acc[appt.collaboratorId] = [];
    }
    acc[appt.collaboratorId].push(appt);
    return acc;
  }, {});

  const data = {
    date,
    generatedAt: new Date().toISOString(),
    summary: {
      totalAppointments: appointments.length,
      scheduled: appointments.filter((a) => a.status === 'SCHEDULED').length,
      inProgress: appointments.filter((a) => a.status === 'IN_PROGRESS').length,
      done: appointments.filter((a) => a.status === 'DONE').length,
      cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
      noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
    },
    collaborators: collaborators.map((col) => ({
      ...col,
      appointments: appointmentsByCollaborator[col.id] ?? [],
    })),
  };

  // Save to cache
  try {
    await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable
  }

  return { data, fromCache: false };
}
