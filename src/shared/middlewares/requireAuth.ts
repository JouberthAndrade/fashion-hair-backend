import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../errors/index.js';

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}
