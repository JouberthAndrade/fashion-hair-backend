import { FastifyRequest, FastifyReply } from 'fastify';
import { createClientSchema, updateClientSchema } from './clients.schema.js';
import {
  listClientsService,
  getClientByIdService,
  createClientService,
  updateClientService,
  deleteClientService,
} from './clients.service.js';

export async function listClientsController(
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number; search?: string; phone?: string } }>,
  reply: FastifyReply,
) {
  const result = await listClientsService(request.server.prisma, request.query);
  return reply.status(200).send(result);
}

export async function getClientController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await getClientByIdService(request.server.prisma, request.params.id);
  return reply.status(200).send(result);
}

export async function createClientController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createClientSchema.parse(request.body);
  const result = await createClientService(request.server.prisma, body);
  return reply.status(201).send(result);
}

export async function updateClientController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = updateClientSchema.parse(request.body);
  const result = await updateClientService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(result);
}

export async function deleteClientController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteClientService(request.server.prisma, request.params.id);
  return reply.status(204).send();
}
