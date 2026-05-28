import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import {
  listClientsController,
  getClientController,
  createClientController,
  updateClientController,
  deleteClientController,
} from './clients.controller.js';

export async function clientsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: number; limit?: number; search?: string; phone?: string } }>(
    '/',
    { preHandler: [requireAuth] },
    listClientsController,
  );
  fastify.post('/', { preHandler: [requireAuth] }, createClientController);
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, getClientController);
  fastify.patch<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, updateClientController);
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    deleteClientController,
  );
}
