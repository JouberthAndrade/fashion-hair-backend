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

export async function servicesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { all?: string } }>('/', { preHandler: [requireAuth] }, listServicesController);
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, getServiceController);
  fastify.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createServiceController);
  fastify.patch<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, updateServiceController);
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, deleteServiceController);
}
