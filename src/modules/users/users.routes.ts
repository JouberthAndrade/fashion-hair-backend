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

const sec = [{ bearerAuth: [] }];

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: { tags: ['Users'], summary: 'Criar colaborador (admin)', security: sec },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    createUserController,
  );
  fastify.get<{ Querystring: { page?: number; limit?: number; role?: string; search?: string } }>(
    '/',
    {
      schema: { tags: ['Users'], summary: 'Listar usuários (admin)', security: sec },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    listUsersController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: { tags: ['Users'], summary: 'Buscar usuário', security: sec },
      preHandler: [requireAuth],
    },
    getUserController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      schema: { tags: ['Users'], summary: 'Atualizar usuário (admin)', security: sec },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    updateUserController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id/password',
    {
      schema: { tags: ['Users'], summary: 'Alterar senha (self)', security: sec },
      preHandler: [requireAuth],
    },
    changePasswordController,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: { tags: ['Users'], summary: 'Desativar usuário (admin)', security: sec },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    deleteUserController,
  );
}
