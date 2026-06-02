import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../shared/errors/index.js';
import { createServiceSchema, updateServiceSchema } from './services.schema.js';
import {
  listServicesService,
  getServiceByIdService,
  createServiceService,
  updateServiceService,
  deleteServiceService,
} from './services.service.js';

export async function listServicesController(
  request: FastifyRequest<{ Querystring: { all?: string } }>,
  reply: FastifyReply,
) {
  const includeInactive = request.query.all === 'true';
  if (includeInactive && request.user.role !== 'ADMIN') {
    throw new ForbiddenError('Acesso negado');
  }
  const result = await listServicesService(request.server.prisma, !includeInactive);
  return reply.status(200).send(result);
}

export async function getServiceController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await getServiceByIdService(request.server.prisma, request.params.id);
  return reply.status(200).send(result);
}

export async function createServiceController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createServiceSchema.parse(request.body);
  const result = await createServiceService(request.server.prisma, body);
  return reply.status(201).send(result);
}

export async function updateServiceController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = updateServiceSchema.parse(request.body);
  const result = await updateServiceService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(result);
}

export async function deleteServiceController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteServiceService(request.server.prisma, request.params.id);
  return reply.status(204).send();
}
