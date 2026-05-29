import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import {
  closeCashController,
  getReportController,
  getSettingsController,
  listClosingsController,
  updateServiceFeeController,
  updateSettingsController,
} from './cash-closing.controller.js';

const sec = [{ bearerAuth: [] }];
const admin = [requireAuth, requireRole('ADMIN')];

export async function cashClosingRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/settings',
    { schema: { tags: ['CashClosing'], summary: 'Configurações de taxa do salão (admin)', security: sec }, preHandler: admin },
    getSettingsController,
  );

  fastify.patch(
    '/settings',
    { schema: { tags: ['CashClosing'], summary: 'Atualizar taxa padrão do salão (admin)', security: sec }, preHandler: admin },
    updateSettingsController,
  );

  fastify.patch<{ Params: { serviceId: string } }>(
    '/services/:serviceId/fee',
    { schema: { tags: ['CashClosing'], summary: 'Taxa do salão por serviço (admin)', security: sec }, preHandler: admin },
    updateServiceFeeController,
  );

  fastify.get<{ Querystring: { period?: string; date?: string } }>(
    '/report',
    { schema: { tags: ['CashClosing'], summary: 'Relatório de fechamento (admin)', security: sec }, preHandler: admin },
    getReportController,
  );

  fastify.post(
    '/close',
    { schema: { tags: ['CashClosing'], summary: 'Registrar fechamento de caixa (admin)', security: sec }, preHandler: admin },
    closeCashController,
  );

  fastify.get(
    '/history',
    { schema: { tags: ['CashClosing'], summary: 'Histórico de fechamentos (admin)', security: sec }, preHandler: admin },
    listClosingsController,
  );
}
