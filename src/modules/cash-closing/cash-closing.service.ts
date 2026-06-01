import { PrismaClient, Service } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/index.js';
import {
  decimalToNumber,
  ensureSalonSettings,
  getDefaultSalonFeeRate,
  resolveAppointmentPrice,
  resolveSalonFeeRate,
  splitRevenue,
} from '../../shared/utils/salonFee.js';
import { enumToPeriod, getPeriodRange, periodToEnum, type ReportPeriod } from '../../shared/utils/periodRange.js';
import { parseDateUTC } from '../../shared/utils/timeSlots.js';
import type { CloseCashBody, UpdateServiceFeeBody, UpdateSettingsBody } from './cash-closing.schema.js';

interface AppointmentRow {
  id: string;
  scheduledDate: Date;
  startTime: string;
  gross: number;
  salonFeeRatePercent: number;
  salonShare: number;
  collaboratorShare: number;
  collaborator: { id: string; name: string };
  client: { id: string; name: string };
  service: { id: string; name: string };
}

async function loadDoneAppointments(
  prisma: PrismaClient,
  start: string,
  end: string,
): Promise<AppointmentRow[]> {
  const appointments = await prisma.appointment.findMany({
    where: {
      deletedAt: null,
      status: 'DONE',
      scheduledDate: {
        gte: parseDateUTC(start),
        lte: parseDateUTC(end),
      },
    },
    orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
    include: {
      collaborator: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, price: true, salonFeeRatePercent: true } },
    },
  });

  const defaultRate = await getDefaultSalonFeeRate(prisma);

  return appointments.map((appt) => {
    const gross =
      appt.priceAtBooking != null
        ? decimalToNumber(appt.priceAtBooking)
        : decimalToNumber(appt.service.price);

    const salonFeeRatePercent =
      appt.salonFeeRateAtBooking != null
        ? decimalToNumber(appt.salonFeeRateAtBooking)
        : appt.service.salonFeeRatePercent != null
          ? decimalToNumber(appt.service.salonFeeRatePercent)
          : defaultRate;

    const { salonShare, collaboratorShare } = splitRevenue(gross, salonFeeRatePercent);

    return {
      id: appt.id,
      scheduledDate: appt.scheduledDate,
      startTime: appt.startTime,
      gross,
      salonFeeRatePercent,
      salonShare,
      collaboratorShare,
      collaborator: appt.collaborator,
      client: appt.client,
      service: { id: appt.service.id, name: appt.service.name },
    };
  });
}

function aggregateReport(
  period: ReportPeriod,
  anchorDate: string,
  rows: AppointmentRow[],
  existingClosing: { id: string; closedAt: Date; closedBy: { name: string } } | null,
) {
  const range = getPeriodRange(period, anchorDate);

  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalSalonShare = rows.reduce((s, r) => s + r.salonShare, 0);
  const totalCollaboratorShare = rows.reduce((s, r) => s + r.collaboratorShare, 0);

  const byCollaboratorMap = new Map<
    string,
    { id: string; name: string; count: number; gross: number; salonShare: number; collaboratorShare: number }
  >();
  const byServiceMap = new Map<
    string,
    { id: string; name: string; count: number; gross: number; salonShare: number; collaboratorShare: number }
  >();

  for (const row of rows) {
    const collab = byCollaboratorMap.get(row.collaborator.id) ?? {
      id: row.collaborator.id,
      name: row.collaborator.name,
      count: 0,
      gross: 0,
      salonShare: 0,
      collaboratorShare: 0,
    };
    collab.count += 1;
    collab.gross = Math.round((collab.gross + row.gross) * 100) / 100;
    collab.salonShare = Math.round((collab.salonShare + row.salonShare) * 100) / 100;
    collab.collaboratorShare = Math.round((collab.collaboratorShare + row.collaboratorShare) * 100) / 100;
    byCollaboratorMap.set(row.collaborator.id, collab);

    const svc = byServiceMap.get(row.service.id) ?? {
      id: row.service.id,
      name: row.service.name,
      count: 0,
      gross: 0,
      salonShare: 0,
      collaboratorShare: 0,
    };
    svc.count += 1;
    svc.gross = Math.round((svc.gross + row.gross) * 100) / 100;
    svc.salonShare = Math.round((svc.salonShare + row.salonShare) * 100) / 100;
    svc.collaboratorShare = Math.round((svc.collaboratorShare + row.collaboratorShare) * 100) / 100;
    byServiceMap.set(row.service.id, svc);
  }

  return {
    period,
    anchorDate,
    periodStart: range.start,
    periodEnd: range.end,
    summary: {
      appointmentCount: rows.length,
      totalGross: Math.round(totalGross * 100) / 100,
      totalSalonShare: Math.round(totalSalonShare * 100) / 100,
      totalCollaboratorShare: Math.round(totalCollaboratorShare * 100) / 100,
    },
    byCollaborator: [...byCollaboratorMap.values()].sort((a, b) => b.gross - a.gross),
    byService: [...byServiceMap.values()].sort((a, b) => b.gross - a.gross),
    appointments: rows.map((r) => ({
      id: r.id,
      scheduledDate: r.scheduledDate.toISOString().split('T')[0],
      startTime: r.startTime,
      gross: r.gross,
      salonFeeRatePercent: r.salonFeeRatePercent,
      salonShare: r.salonShare,
      collaboratorShare: r.collaboratorShare,
      clientName: r.client.name,
      serviceName: r.service.name,
      collaboratorName: r.collaborator.name,
    })),
    isClosed: Boolean(existingClosing),
    closing: existingClosing
      ? {
          id: existingClosing.id,
          closedAt: existingClosing.closedAt.toISOString(),
          closedByName: existingClosing.closedBy.name,
        }
      : null,
  };
}

export async function getSettingsService(prisma: PrismaClient) {
  const settings = await ensureSalonSettings(prisma);
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      price: true,
      salonFeeRatePercent: true,
    },
  });

  return {
    defaultSalonFeeRatePercent: decimalToNumber(settings.defaultSalonFeeRatePercent),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      price: decimalToNumber(s.price),
      salonFeeRatePercent:
        s.salonFeeRatePercent != null ? decimalToNumber(s.salonFeeRatePercent) : null,
    })),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function updateSettingsService(
  prisma: PrismaClient,
  adminId: string,
  data: UpdateSettingsBody,
) {
  const settings = await prisma.salonSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      defaultSalonFeeRatePercent: data.defaultSalonFeeRatePercent,
      updatedById: adminId,
    },
    update: {
      defaultSalonFeeRatePercent: data.defaultSalonFeeRatePercent,
      updatedById: adminId,
    },
  });

  return {
    defaultSalonFeeRatePercent: decimalToNumber(settings.defaultSalonFeeRatePercent),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function updateServiceFeeService(
  prisma: PrismaClient,
  serviceId: string,
  data: UpdateServiceFeeBody,
) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new NotFoundError('Serviço não encontrado');

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      salonFeeRatePercent: data.salonFeeRatePercent,
    },
    select: {
      id: true,
      name: true,
      price: true,
      salonFeeRatePercent: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    price: decimalToNumber(updated.price),
    salonFeeRatePercent:
      updated.salonFeeRatePercent != null ? decimalToNumber(updated.salonFeeRatePercent) : null,
  };
}

export async function getReportService(
  prisma: PrismaClient,
  period: ReportPeriod,
  anchorDate: string,
) {
  const range = getPeriodRange(period, anchorDate);
  const periodEnum = periodToEnum(period);

  const existingClosing = await prisma.cashClosing.findUnique({
    where: {
      period_periodStart_periodEnd: {
        period: periodEnum,
        periodStart: parseDateUTC(range.start),
        periodEnd: parseDateUTC(range.end),
      },
    },
    include: { closedBy: { select: { name: true } } },
  });

  const rows = await loadDoneAppointments(prisma, range.start, range.end);
  return aggregateReport(period, anchorDate, rows, existingClosing);
}

export async function closeCashService(
  prisma: PrismaClient,
  adminId: string,
  data: CloseCashBody,
) {
  const report = await getReportService(prisma, data.period, data.date);

  if (report.isClosed) {
    throw new ConflictError('Este período já foi fechado');
  }

  if (report.summary.appointmentCount === 0) {
    throw new ConflictError('Não há atendimentos concluídos para fechar neste período');
  }

  const closing = await prisma.cashClosing.create({
    data: {
      period: periodToEnum(data.period),
      periodStart: parseDateUTC(report.periodStart),
      periodEnd: parseDateUTC(report.periodEnd),
      totalGross: report.summary.totalGross,
      totalSalonShare: report.summary.totalSalonShare,
      totalCollaboratorShare: report.summary.totalCollaboratorShare,
      appointmentCount: report.summary.appointmentCount,
      notes: data.notes,
      closedById: adminId,
    },
    include: { closedBy: { select: { name: true } } },
  });

  return {
    ...report,
    isClosed: true,
    closing: {
      id: closing.id,
      closedAt: closing.closedAt.toISOString(),
      closedByName: closing.closedBy.name,
    },
  };
}

export async function listClosingsService(prisma: PrismaClient, limit = 20) {
  const closings = await prisma.cashClosing.findMany({
    take: limit,
    orderBy: { closedAt: 'desc' },
    include: { closedBy: { select: { name: true } } },
  });

  return closings.map((c) => ({
    id: c.id,
    period: enumToPeriod(c.period),
    periodStart: c.periodStart.toISOString().split('T')[0],
    periodEnd: c.periodEnd.toISOString().split('T')[0],
    totalGross: decimalToNumber(c.totalGross),
    totalSalonShare: decimalToNumber(c.totalSalonShare),
    totalCollaboratorShare: decimalToNumber(c.totalCollaboratorShare),
    appointmentCount: c.appointmentCount,
    notes: c.notes,
    closedAt: c.closedAt.toISOString(),
    closedByName: c.closedBy.name,
  }));
}

/**
 * Snapshot de preço + taxa gravado no agendamento (criação/edição/checkout).
 * O preço cobrado é resolvido por: explícito > price book do cliente > padrão.
 * A taxa do salão é SEMPRE resolvida no servidor (nunca enviada pelo colaborador).
 */
export async function buildBookingSnapshots(
  prisma: PrismaClient,
  service: Pick<Service, 'id' | 'price' | 'salonFeeRatePercent'>,
  clientId: string,
  options?: {
    explicitPrice?: number | null;
    requestUserId?: string;
    /** Na criação sem preço explícito: usa só o catálogo, ignora price book. */
    standardPriceOnly?: boolean;
  },
) {
  const feeRate = await resolveSalonFeeRate(prisma, service);
  const standardPrice = decimalToNumber(service.price);
  const resolved =
    options?.standardPriceOnly && options.explicitPrice == null
      ? {
          price: standardPrice,
          standardPrice,
          source: 'standard' as const,
          isCustomPrice: false,
        }
      : await resolveAppointmentPrice(
          prisma,
          clientId,
          service,
          options?.explicitPrice,
        );

  return {
    priceAtBooking: resolved.price,
    standardPriceAtBooking: resolved.standardPrice,
    salonFeeRateAtBooking: feeRate,
    priceSetById: resolved.isCustomPrice ? options?.requestUserId ?? null : null,
    isCustomPrice: resolved.isCustomPrice,
  };
}
