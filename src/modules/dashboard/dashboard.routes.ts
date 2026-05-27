import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { dailyDashboardController } from './dashboard.controller.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // GET /dashboard/daily?date=YYYY-MM-DD
  // Redis-cached, 2-minute TTL, invalidated on appointment writes
  fastify.get<{ Querystring: { date?: string } }>(
    '/daily',
    { preHandler: [requireAuth] },
    dailyDashboardController,
  );
}
