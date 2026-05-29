import { FastifyInstance } from 'fastify';
import {
  loginController,
  refreshTokenController,
  logoutController,
  meController,
} from './auth.controller.js';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login (retorna access + refresh token)',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
      },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    loginController,
  );

  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Renovar tokens (rotação)',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    refreshTokenController,
  );

  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout (revoga refresh token)',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    logoutController,
  );

  fastify.get(
    '/me',
    {
      schema: { tags: ['Auth'], summary: 'Usuário autenticado', security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth],
    },
    meController,
  );
}
