import { FastifyInstance } from 'fastify';
import {
  loginController,
  refreshTokenController,
  logoutController,
  meController,
} from './auth.controller.js';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login
  fastify.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, loginController);

  // POST /auth/refresh
  fastify.post('/refresh', refreshTokenController);

  // POST /auth/logout
  fastify.post('/logout', logoutController);

  // GET /auth/me
  fastify.get('/me', { preHandler: [requireAuth] }, meController);
}
