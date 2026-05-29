import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { env } from './config/env.js';
import prismaPlugin from './plugins/prisma.plugin.js';
import redisPlugin from './plugins/redis.plugin.js';
import jwtPlugin from './plugins/jwt.plugin.js';
import { registerErrorHandler } from './hooks/errorHandler.js';

// Routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { collaboratorsRoutes } from './modules/collaborators/collaborators.routes.js';
import { clientsRoutes } from './modules/clients/clients.routes.js';
import { servicesRoutes } from './modules/services/services.routes.js';
import { appointmentsRoutes } from './modules/appointments/appointments.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { cashClosingRoutes } from './modules/cash-closing/cash-closing.routes.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: env.TRUST_PROXY,
  });

  // ── Security plugins ──────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // disable CSP for API
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Muitas requisições. Tente novamente em ${Math.ceil(context.ttl / 1000)} segundos.`,
      statusCode: 429,
    }),
  });

  // ── Data plugins ──────────────────────────────────────────────────
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(jwtPlugin);

  // ── Global error handler ──────────────────────────────────────────
  registerErrorHandler(fastify);

  // ── OpenAPI / Swagger ─────────────────────────────────────────────
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Fashion Hair API',
        description: 'API RESTful para sistema de agendamentos de salão de beleza',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Login, refresh, logout, me' },
        { name: 'Users', description: 'Gerenciamento de usuários (admin)' },
        { name: 'Collaborators', description: 'Perfis e horários de colaboradores' },
        { name: 'Clients', description: 'Cadastro de clientes' },
        { name: 'Services', description: 'Serviços do salão' },
        { name: 'Appointments', description: 'Agendamentos (core)' },
        { name: 'Dashboard', description: 'Painel diário cacheado' },
        { name: 'CashClosing', description: 'Fechamento de caixa e taxas do salão' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true, persistAuthorization: true },
  });

  // ── Routes ────────────────────────────────────────────────────────
  const API_PREFIX = '/api/v1';

  fastify.register(authRoutes, { prefix: `${API_PREFIX}/auth` });
  fastify.register(usersRoutes, { prefix: `${API_PREFIX}/users` });
  fastify.register(collaboratorsRoutes, { prefix: `${API_PREFIX}/collaborators` });
  fastify.register(clientsRoutes, { prefix: `${API_PREFIX}/clients` });
  fastify.register(servicesRoutes, { prefix: `${API_PREFIX}/services` });
  fastify.register(appointmentsRoutes, { prefix: `${API_PREFIX}/appointments` });
  fastify.register(dashboardRoutes, { prefix: `${API_PREFIX}/dashboard` });
  fastify.register(cashClosingRoutes, { prefix: `${API_PREFIX}/cash-closing` });

  // ── Health check ─────────────────────────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  return fastify;
}
