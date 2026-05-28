import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import {
  createUserController,
  listUsersController,
  getUserController,
  updateUserController,
  changePasswordController,
  deleteUserController,
} from './users.controller.js';

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createUserController);
  fastify.get<{ Querystring: { page?: number; limit?: number; role?: string; search?: string } }>(
    '/',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    listUsersController,
  );
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, getUserController);
  fastify.patch<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, updateUserController);
  fastify.patch<{ Params: { id: string } }>('/:id/password', { preHandler: [requireAuth] }, changePasswordController);
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, deleteUserController);
}
