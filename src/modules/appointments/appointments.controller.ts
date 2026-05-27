import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateStatusSchema,
} from './appointments.schema.js';
import {
  createAppointmentService,
  getAppointmentService,
  listMyAppointmentsService,
  updateAppointmentService,
  updateStatusService,
  cancelAppointmentService,
} from './appointments.service.js';
import { ValidationError } from '../../shared/errors/index.js';

export async function createAppointmentController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createAppointmentSchema.parse(request.body);
  const result = await createAppointmentService(
    request.server.prisma,
    request.server.redis,
    request.user.sub,
    body,
  );
  return reply.status(201).send(result);
}

export async function listMyAppointmentsController(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply,
) {
  const date = request.query.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('Formato de data inválido (use YYYY-MM-DD)');
  }
  const result = await listMyAppointmentsService(
    request.server.prisma,
    request.user.sub,
    date,
  );
  return reply.status(200).send(result);
}

export async function getAppointmentController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await getAppointmentService(
    request.server.prisma,
    request.params.id,
    request.user.sub,
    request.user.role,
  );
  return reply.status(200).send(result);
}

export async function updateAppointmentController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = updateAppointmentSchema.parse(request.body);
  const result = await updateAppointmentService(
    request.server.prisma,
    request.server.redis,
    request.params.id,
    request.user.sub,
    request.user.role,
    body,
  );
  return reply.status(200).send(result);
}

export async function updateStatusController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = updateStatusSchema.parse(request.body);
  const result = await updateStatusService(
    request.server.prisma,
    request.server.redis,
    request.params.id,
    request.user.sub,
    request.user.role,
    body,
  );
  return reply.status(200).send(result);
}

export async function cancelAppointmentController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await cancelAppointmentService(
    request.server.prisma,
    request.server.redis,
    request.params.id,
    request.user.sub,
    request.user.role,
  );
  return reply.status(204).send();
}
