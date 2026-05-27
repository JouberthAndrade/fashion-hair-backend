import { FastifyRequest, FastifyReply } from 'fastify';
import { getDailyDashboardService } from './dashboard.service.js';
import { ValidationError } from '../../shared/errors/index.js';

export async function dailyDashboardController(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply,
) {
  const date = request.query.date ?? new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('Formato de data inválido (use YYYY-MM-DD)');
  }

  const result = await getDailyDashboardService(
    request.server.prisma,
    request.server.redis,
    date,
  );

  reply.header('X-Cache', result.fromCache ? 'HIT' : 'MISS');
  return reply.status(200).send(result.data);
}
