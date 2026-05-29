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

const sec = [{ bearerAuth: [] }];

export async function clientsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: number; limit?: number; search?: string; phone?: string } }>(
    '/',
    { schema: { tags: ['Clients'], summary: 'Listar/buscar clientes', security: sec }, preHandler: [requireAuth] },
    listClientsController,
  );
  fastify.post(
    '/',
    { schema: { tags: ['Clients'], summary: 'Cadastrar cliente', security: sec }, preHandler: [requireAuth] },
    createClientController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Clients'], summary: 'Buscar cliente + histórico', security: sec }, preHandler: [requireAuth] },
    getClientController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Clients'], summary: 'Atualizar cliente', security: sec }, preHandler: [requireAuth] },
    updateClientController,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Clients'], summary: 'Remover cliente (admin)', security: sec }, preHandler: [requireAuth, requireRole('ADMIN')] },
    deleteClientController,
  );
}
