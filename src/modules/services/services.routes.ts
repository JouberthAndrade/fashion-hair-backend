import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import {
  listServicesController,
  getServiceController,
  createServiceController,
  updateServiceController,
  deleteServiceController,
} from './services.controller.js';

const sec = [{ bearerAuth: [] }];

export async function servicesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { all?: string } }>(
    '/',
    { schema: { tags: ['Services'], summary: 'Listar serviços ativos', security: sec }, preHandler: [requireAuth] },
    listServicesController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Services'], summary: 'Buscar serviço', security: sec }, preHandler: [requireAuth] },
    getServiceController,
  );
  fastify.post(
    '/',
    { schema: { tags: ['Services'], summary: 'Criar serviço (admin)', security: sec }, preHandler: [requireAuth, requireRole('ADMIN')] },
    createServiceController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Services'], summary: 'Atualizar serviço (admin)', security: sec }, preHandler: [requireAuth, requireRole('ADMIN')] },
    updateServiceController,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Services'], summary: 'Desativar serviço (admin)', security: sec }, preHandler: [requireAuth, requireRole('ADMIN')] },
    deleteServiceController,
  );
}
