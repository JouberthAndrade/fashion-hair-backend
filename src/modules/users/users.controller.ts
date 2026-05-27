import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './users.schema.js';
import {
  createUserService,
  listUsersService,
  getUserByIdService,
  updateUserService,
  changePasswordService,
  deleteUserService,
} from './users.service.js';
import { ForbiddenError } from '../../shared/errors/index.js';

export async function createUserController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createUserSchema.parse(request.body);
  const user = await createUserService(request.server.prisma, body);
  return reply.status(201).send(user);
}

export async function listUsersController(
  request: FastifyRequest<{ Querystring: { page?: number; limit?: number; role?: string; search?: string } }>,
  reply: FastifyReply,
) {
  const result = await listUsersService(request.server.prisma, request.query);
  return reply.status(200).send(result);
}

export async function getUserController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  // Collaborator can only see their own data
  if (
    request.user.role !== 'ADMIN' &&
    request.user.sub !== request.params.id
  ) {
    throw new ForbiddenError('Acesso negado');
  }
  const user = await getUserByIdService(request.server.prisma, request.params.id);
  return reply.status(200).send(user);
}

export async function updateUserController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = updateUserSchema.parse(request.body);
  const user = await updateUserService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(user);
}

export async function changePasswordController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  // Only the user themselves can change their password
  if (request.user.sub !== request.params.id) {
    throw new ForbiddenError('Acesso negado');
  }
  const body = changePasswordSchema.parse(request.body);
  const result = await changePasswordService(request.server.prisma, request.params.id, body);
  return reply.status(200).send(result);
}

export async function deleteUserController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteUserService(request.server.prisma, request.params.id);
  return reply.status(204).send();
}
