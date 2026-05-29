import { FastifyRequest, FastifyReply } from 'fastify';
import {
  closeCashSchema,
  reportQuerySchema,
  updateServiceFeeSchema,
  updateSettingsSchema,
} from './cash-closing.schema.js';
import {
  closeCashService,
  getReportService,
  getSettingsService,
  listClosingsService,
  updateServiceFeeService,
  updateSettingsService,
} from './cash-closing.service.js';

export async function getSettingsController(_request: FastifyRequest, reply: FastifyReply) {
  const result = await getSettingsService(_request.server.prisma);
  return reply.status(200).send(result);
}

export async function updateSettingsController(request: FastifyRequest, reply: FastifyReply) {
  const body = updateSettingsSchema.parse(request.body);
  const result = await updateSettingsService(
    request.server.prisma,
    request.user.sub,
    body,
  );
  return reply.status(200).send(result);
}

export async function updateServiceFeeController(
  request: FastifyRequest<{ Params: { serviceId: string } }>,
  reply: FastifyReply,
) {
  const body = updateServiceFeeSchema.parse(request.body);
  const result = await updateServiceFeeService(
    request.server.prisma,
    request.params.serviceId,
    body,
  );
  return reply.status(200).send(result);
}

export async function getReportController(
  request: FastifyRequest<{ Querystring: { period?: string; date?: string } }>,
  reply: FastifyReply,
) {
  const query = reportQuerySchema.parse({
    period: request.query.period ?? 'day',
    date: request.query.date ?? new Date().toISOString().split('T')[0],
  });
  const result = await getReportService(request.server.prisma, query.period, query.date);
  return reply.status(200).send(result);
}

export async function closeCashController(request: FastifyRequest, reply: FastifyReply) {
  const body = closeCashSchema.parse(request.body);
  const result = await closeCashService(request.server.prisma, request.user.sub, body);
  return reply.status(201).send(result);
}

export async function listClosingsController(_request: FastifyRequest, reply: FastifyReply) {
  const result = await listClosingsService(_request.server.prisma);
  return reply.status(200).send(result);
}
