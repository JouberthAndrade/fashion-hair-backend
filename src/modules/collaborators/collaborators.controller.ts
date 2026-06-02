import { FastifyRequest, FastifyReply } from 'fastify';
import { upsertProfileSchema, upsertWorkingHoursSchema } from './collaborators.schema.js';
import {
  listCollaboratorsService,
  getCollaboratorService,
  upsertProfileService,
  upsertWorkingHoursService,
  getWorkingHoursService,
} from './collaborators.service.js';
import { ForbiddenError } from '../../shared/errors/index.js';

function canManage(request: FastifyRequest, targetId: string): boolean {
  return request.user.role === 'ADMIN' || request.user.sub === targetId;
}

export async function listCollaboratorsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await listCollaboratorsService(request.server.prisma);
  return reply.status(200).send(result);
}

export async function getCollaboratorController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!canManage(request, request.params.id)) throw new ForbiddenError();
  const result = await getCollaboratorService(request.server.prisma, request.params.id);
  return reply.status(200).send(result);
}

export async function upsertProfileController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!canManage(request, request.params.id)) throw new ForbiddenError();
  const body = upsertProfileSchema.parse(request.body);
  const result = await upsertProfileService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(result);
}

export async function upsertWorkingHoursController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!canManage(request, request.params.id)) throw new ForbiddenError();
  const body = upsertWorkingHoursSchema.parse(request.body);
  const result = await upsertWorkingHoursService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(result);
}

export async function getWorkingHoursController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  if (!canManage(request, request.params.id)) throw new ForbiddenError();
  const result = await getWorkingHoursService(request.server.prisma, request.params.id);
  return reply.status(200).send(result);
}
