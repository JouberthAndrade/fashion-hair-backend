import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import { dailyDashboardController } from './dashboard.controller.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { date?: string } }>(
    '/daily',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Painel diário (todos os agendamentos por colaborador, cache Redis 2min)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    dailyDashboardController,
  );
}
