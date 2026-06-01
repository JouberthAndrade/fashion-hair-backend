import { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import {
  addMinutesToTime,
  formatDateUTC,
  generateTimeSlots,
  getDayOfWeek,
  hasTimeOverlap,
  parseDateUTC,
  timeToMinutes,
} from '../../shared/utils/timeSlots.js';
import { listServicesService } from '../services/services.service.js';
import { listCollaboratorsService } from '../collaborators/collaborators.service.js';
import {
  assertNoOverlap,
  assertWorkingHours,
  createAppointmentService,
} from '../appointments/appointments.service.js';
import type { AvailabilityQuery, CreatePublicAppointmentBody } from './public-booking.schema.js';
import {
  collaboratorMatchesService,
  resolveServiceSpecialty,
} from '../../shared/utils/serviceSpecialty.js';
import { resolvePublicBookingClient } from './public-booking-client.service.js';

const PRIVACY_POLICY_TEXT = `# Política de Privacidade — Fashion Hair

**Versão:** ${env.PRIVACY_POLICY_VERSION}

## Finalidade

Coletamos nome, e-mail e telefone exclusivamente para agendar seu atendimento no salão e entrar em contato sobre o horário reservado.

## Base legal

Execução de contrato/pedido do titular (agendamento) e legítimo interesse limitado para lembretes operacionais.

## Retenção

Mantemos os dados enquanto houver relação de atendimento ou obrigação legal aplicável.

## Seus direitos

Você pode solicitar acesso, correção ou exclusão dos seus dados pelo canal **privacidade@fashionhair.com.br**.

## Marketing

Comunicações promocionais só serão enviadas se você marcar a opção correspondente no formulário de agendamento.
`;

function getSalonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: env.TZ }).format(new Date());
}

function getSalonCurrentTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: env.TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

function assertBookingDateWindow(date: string) {
  const today = getSalonToday();
  if (date < today) {
    throw new ValidationError('Não é possível agendar em datas passadas');
  }

  const maxDate = new Date(`${today}T00:00:00.000Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + env.PUBLIC_BOOKING_MAX_DAYS);
  const maxDateStr = formatDateUTC(maxDate);

  if (date > maxDateStr) {
    throw new ValidationError(
      `Agendamentos disponíveis apenas até ${maxDateStr}`,
    );
  }
}

export async function listPublicServicesService(prisma: PrismaClient) {
  const services = await listServicesService(prisma, true);
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: Number(s.price),
    specialty: resolveServiceSpecialty(s),
  }));
}

export async function listPublicCollaboratorsService(
  prisma: PrismaClient,
  serviceId: string,
) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw new NotFoundError('Serviço não encontrado ou inativo');
  }

  const collaborators = await listCollaboratorsService(prisma);
  return collaborators
    .filter((c) =>
      collaboratorMatchesService(c.collaboratorProfile?.specialty, service),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      specialty: c.collaboratorProfile?.specialty ?? null,
      bio: c.collaboratorProfile?.bio ?? null,
      avatarUrl: c.collaboratorProfile?.avatarUrl ?? null,
    }));
}

export async function getAvailabilityService(
  prisma: PrismaClient,
  query: AvailabilityQuery,
) {
  assertBookingDateWindow(query.date);

  const service = await prisma.service.findUnique({ where: { id: query.serviceId } });
  if (!service || !service.isActive) {
    throw new NotFoundError('Serviço não encontrado ou inativo');
  }

  const collaborator = await prisma.user.findFirst({
    where: { id: query.collaboratorId, deletedAt: null, isActive: true, role: 'COLLABORATOR' },
    include: { collaboratorProfile: true },
  });
  if (!collaborator) throw new NotFoundError('Colaborador não encontrado');

  const profile = collaborator.collaboratorProfile;
  if (!profile) {
    return { date: query.date, slots: [] as string[] };
  }

  const dayOfWeek = getDayOfWeek(query.date) as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

  const workingHour = await prisma.workingHours.findUnique({
    where: {
      collaboratorId_dayOfWeek: {
        collaboratorId: profile.id,
        dayOfWeek,
      },
    },
  });

  if (!workingHour || !workingHour.isActive) {
    return { date: query.date, slots: [] as string[] };
  }

  const candidates = generateTimeSlots(
    workingHour.startTime,
    workingHour.endTime,
    service.durationMin,
  );

  const scheduledDate = parseDateUTC(query.date);
  const existing = await prisma.appointment.findMany({
    where: {
      collaboratorId: query.collaboratorId,
      scheduledDate,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { startTime: true, endTime: true },
  });

  const today = getSalonToday();
  const nowTime = getSalonCurrentTime();

  const slots = candidates.filter((startTime) => {
    const endTime = addMinutesToTime(startTime, service.durationMin);

    if (query.date === today && timeToMinutes(startTime) <= timeToMinutes(nowTime)) {
      return false;
    }

    const overlaps = existing.some((appt) =>
      hasTimeOverlap(startTime, endTime, appt.startTime, appt.endTime),
    );
    return !overlaps;
  });

  return { date: query.date, slots };
}

export async function createPublicAppointmentService(
  prisma: PrismaClient,
  redis: Redis,
  data: CreatePublicAppointmentBody,
) {
  if (data.website) {
    throw new ValidationError('Requisição inválida');
  }

  assertBookingDateWindow(data.scheduledDate);

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.isActive) {
    throw new NotFoundError('Serviço não encontrado ou inativo');
  }

  const collaborator = await prisma.user.findFirst({
    where: { id: data.collaboratorId, deletedAt: null, isActive: true, role: 'COLLABORATOR' },
    include: { collaboratorProfile: true },
  });
  if (!collaborator) throw new NotFoundError('Colaborador não encontrado');

  if (
    !collaboratorMatchesService(collaborator.collaboratorProfile?.specialty, service)
  ) {
    throw new ValidationError('Este profissional não realiza o serviço selecionado');
  }

  const endTime = addMinutesToTime(data.startTime, service.durationMin);
  await assertWorkingHours(
    prisma,
    data.collaboratorId,
    data.scheduledDate,
    data.startTime,
    endTime,
  );
  await assertNoOverlap(
    prisma,
    data.collaboratorId,
    data.scheduledDate,
    data.startTime,
    endTime,
  );

  const availability = await getAvailabilityService(prisma, {
    collaboratorId: data.collaboratorId,
    serviceId: data.serviceId,
    date: data.scheduledDate,
  });

  if (!availability.slots.includes(data.startTime)) {
    throw new ValidationError('Horário selecionado não está mais disponível');
  }

  const client = await resolvePublicBookingClient(prisma, data.client, data.marketingOptIn);

  const actorId = env.PUBLIC_BOOKING_ACTOR_ID ?? data.collaboratorId;

  const appointment = await createAppointmentService(prisma, redis, actorId, {
    collaboratorId: data.collaboratorId,
    serviceId: data.serviceId,
    scheduledDate: data.scheduledDate,
    startTime: data.startTime,
    clientId: client.id,
  });

  return {
    id: appointment.id,
    scheduledDate: data.scheduledDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    service: {
      id: appointment.service.id,
      name: appointment.service.name,
      durationMin: appointment.service.durationMin,
      price: Number(appointment.service.price),
    },
    collaborator: {
      id: appointment.collaborator.id,
      name: appointment.collaborator.name,
    },
    client: {
      name: client.name,
      email: client.email ?? data.client.email,
    },
  };
}

export function getPrivacyPolicyService() {
  return {
    version: env.PRIVACY_POLICY_VERSION,
    content: PRIVACY_POLICY_TEXT,
    updatedAt: '2026-06-01',
  };
}
