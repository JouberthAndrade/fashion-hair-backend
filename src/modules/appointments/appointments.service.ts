import { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../shared/errors/index.js';
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  UpdateStatusBody,
} from './appointments.schema.js';
import {
  addMinutesToTime,
  getDayOfWeek,
} from '../../shared/utils/timeSlots.js';
import { CACHE_KEYS, STATUS_TRANSITIONS } from '../../config/constants.js';

async function invalidateDashboardCache(redis: Redis, date: string) {
  try {
    await redis.del(CACHE_KEYS.DAILY_DASHBOARD(date));
  } catch {
    // Redis unavailable — ignore
  }
}

async function checkOverlap(
  prisma: PrismaClient,
  collaboratorId: string,
  scheduledDate: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  const date = new Date(`${scheduledDate}T00:00:00`);

  const overlap = await prisma.appointment.findFirst({
    where: {
      collaboratorId,
      scheduledDate: date,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });

  if (overlap) {
    throw new ConflictError(
      `Conflito de horário: já existe um agendamento das ${overlap.startTime} às ${overlap.endTime}`,
    );
  }
}

async function validateWorkingHours(
  prisma: PrismaClient,
  collaboratorId: string,
  scheduledDate: string,
  startTime: string,
  endTime: string,
) {
  const profile = await prisma.collaboratorProfile.findUnique({
    where: { userId: collaboratorId },
  });
  if (!profile) return; // No profile = no restriction

  const dayOfWeek = getDayOfWeek(scheduledDate) as any;

  const workingHour = await prisma.workingHours.findUnique({
    where: {
      collaboratorId_dayOfWeek: {
        collaboratorId: profile.id,
        dayOfWeek,
      },
    },
  });

  if (!workingHour || !workingHour.isActive) {
    const dayNames: Record<string, string> = {
      MONDAY: 'segunda-feira',
      TUESDAY: 'terça-feira',
      WEDNESDAY: 'quarta-feira',
      THURSDAY: 'quinta-feira',
      FRIDAY: 'sexta-feira',
      SATURDAY: 'sábado',
      SUNDAY: 'domingo',
    };
    throw new ValidationError(
      `${dayNames[dayOfWeek] ?? dayOfWeek} não é dia de trabalho para este colaborador`,
    );
  }

  if (startTime < workingHour.startTime || endTime > workingHour.endTime) {
    throw new ValidationError(
      `Horário fora do expediente (${workingHour.startTime} - ${workingHour.endTime})`,
    );
  }
}

export async function createAppointmentService(
  prisma: PrismaClient,
  redis: Redis,
  requestUserId: string,
  data: CreateAppointmentBody,
) {
  // Get service for duration
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  });
  if (!service || !service.isActive) throw new NotFoundError('Serviço não encontrado ou inativo');

  // Get collaborator
  const collaborator = await prisma.user.findFirst({
    where: { id: data.collaboratorId, deletedAt: null, isActive: true },
  });
  if (!collaborator) throw new NotFoundError('Colaborador não encontrado');

  const endTime = addMinutesToTime(data.startTime, service.durationMin);

  // Validate working hours
  await validateWorkingHours(
    prisma,
    data.collaboratorId,
    data.scheduledDate,
    data.startTime,
    endTime,
  );

  // Check overlap
  await checkOverlap(prisma, data.collaboratorId, data.scheduledDate, data.startTime, endTime);

  // Resolve client
  let clientId = data.clientId;
  if (!clientId && data.newClient) {
    const existing = await prisma.client.findFirst({
      where: { phone: data.newClient.phone, deletedAt: null },
    });
    if (existing) {
      clientId = existing.id;
    } else {
      const created = await prisma.client.create({ data: data.newClient });
      clientId = created.id;
    }
  }

  const date = new Date(`${data.scheduledDate}T00:00:00`);

  const appointment = await prisma.appointment.create({
    data: {
      collaboratorId: data.collaboratorId,
      clientId: clientId!,
      serviceId: data.serviceId,
      scheduledDate: date,
      startTime: data.startTime,
      endTime,
      notes: data.notes,
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, durationMin: true, price: true } },
      collaborator: { select: { id: true, name: true } },
    },
  });

  await invalidateDashboardCache(redis, data.scheduledDate);

  return appointment;
}

export async function getAppointmentService(
  prisma: PrismaClient,
  id: string,
  requestUserId: string,
  requestUserRole: string,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: true,
      service: true,
      collaborator: { select: { id: true, name: true } },
    },
  });

  if (!appointment) throw new NotFoundError('Agendamento não encontrado');

  if (
    requestUserRole !== 'ADMIN' &&
    appointment.collaboratorId !== requestUserId
  ) {
    throw new ForbiddenError('Acesso negado');
  }

  return appointment;
}

export async function listMyAppointmentsService(
  prisma: PrismaClient,
  collaboratorId: string,
  date: string,
) {
  const scheduledDate = new Date(`${date}T00:00:00`);

  return prisma.appointment.findMany({
    where: {
      collaboratorId,
      scheduledDate,
      deletedAt: null,
    },
    orderBy: { startTime: 'asc' },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, durationMin: true, price: true } },
    },
  });
}

export async function updateAppointmentService(
  prisma: PrismaClient,
  redis: Redis,
  id: string,
  requestUserId: string,
  requestUserRole: string,
  data: UpdateAppointmentBody,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    include: { service: true },
  });
  if (!appointment) throw new NotFoundError('Agendamento não encontrado');

  if (
    requestUserRole !== 'ADMIN' &&
    appointment.collaboratorId !== requestUserId
  ) {
    throw new ForbiddenError('Acesso negado');
  }

  if (['DONE', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
    throw new ValidationError('Não é possível alterar um agendamento finalizado');
  }

  const newDate = data.scheduledDate ?? appointment.scheduledDate.toISOString().split('T')[0];
  const newService = data.serviceId
    ? await prisma.service.findUnique({ where: { id: data.serviceId } })
    : appointment.service;

  if (!newService) throw new NotFoundError('Serviço não encontrado');

  const newStartTime = data.startTime ?? appointment.startTime;
  const newEndTime = addMinutesToTime(newStartTime, newService.durationMin);

  if (data.scheduledDate || data.startTime) {
    await validateWorkingHours(
      prisma,
      appointment.collaboratorId,
      newDate,
      newStartTime,
      newEndTime,
    );
    await checkOverlap(
      prisma,
      appointment.collaboratorId,
      newDate,
      newStartTime,
      newEndTime,
      id,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(data.scheduledDate ? { scheduledDate: new Date(`${data.scheduledDate}T00:00:00`) } : {}),
      ...(data.startTime ? { startTime: newStartTime, endTime: newEndTime } : {}),
      ...(data.serviceId ? { serviceId: data.serviceId } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
      collaborator: { select: { id: true, name: true } },
    },
  });

  await invalidateDashboardCache(redis, newDate);
  return updated;
}

export async function updateStatusService(
  prisma: PrismaClient,
  redis: Redis,
  id: string,
  requestUserId: string,
  requestUserRole: string,
  data: UpdateStatusBody,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
  });
  if (!appointment) throw new NotFoundError('Agendamento não encontrado');

  if (
    requestUserRole !== 'ADMIN' &&
    appointment.collaboratorId !== requestUserId
  ) {
    throw new ForbiddenError('Acesso negado');
  }

  const allowed = STATUS_TRANSITIONS[appointment.status];
  if (!allowed || !allowed.includes(data.status)) {
    throw new ValidationError(
      `Transição inválida: ${appointment.status} → ${data.status}`,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: data.status },
  });

  const dateStr = appointment.scheduledDate.toISOString().split('T')[0];
  await invalidateDashboardCache(redis, dateStr);

  return updated;
}

export async function cancelAppointmentService(
  prisma: PrismaClient,
  redis: Redis,
  id: string,
  requestUserId: string,
  requestUserRole: string,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
  });
  if (!appointment) throw new NotFoundError('Agendamento não encontrado');

  if (
    requestUserRole !== 'ADMIN' &&
    appointment.collaboratorId !== requestUserId
  ) {
    throw new ForbiddenError('Acesso negado');
  }

  if (['DONE', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
    throw new ValidationError('Agendamento já finalizado');
  }

  await prisma.appointment.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'CANCELLED' },
  });

  const dateStr = appointment.scheduledDate.toISOString().split('T')[0];
  await invalidateDashboardCache(redis, dateStr);
}
