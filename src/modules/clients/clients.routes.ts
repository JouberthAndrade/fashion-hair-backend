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
import {
  listClientPricesController,
  resolveClientPriceController,
  upsertClientPriceController,
  deleteClientPriceController,
} from './client-prices.controller.js';

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

  // ── Price book (preço por cliente + serviço) ───────────────────────
  fastify.get<{ Params: { clientId: string } }>(
    '/:clientId/prices',
    { schema: { tags: ['Clients'], summary: 'Listar preços do cliente', security: sec }, preHandler: [requireAuth] },
    listClientPricesController,
  );
  fastify.get<{ Params: { clientId: string; serviceId: string } }>(
    '/:clientId/prices/:serviceId/resolve',
    { schema: { tags: ['Clients'], summary: 'Resolver preço sugerido (book ou padrão)', security: sec }, preHandler: [requireAuth] },
    resolveClientPriceController,
  );
  fastify.put<{ Params: { clientId: string; serviceId: string } }>(
    '/:clientId/prices/:serviceId',
    { schema: { tags: ['Clients'], summary: 'Definir preço do cliente para o serviço', security: sec }, preHandler: [requireAuth] },
    upsertClientPriceController,
  );
  fastify.delete<{ Params: { clientId: string; serviceId: string } }>(
    '/:clientId/prices/:serviceId',
    { schema: { tags: ['Clients'], summary: 'Remover preço (volta ao padrão)', security: sec }, preHandler: [requireAuth] },
    deleteClientPriceController,
  );
}
