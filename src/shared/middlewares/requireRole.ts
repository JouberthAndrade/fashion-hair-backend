import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../errors/index.js';

export function requireRole(...roles: UserRole[]) {
  return async function (
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user || !roles.includes(user.role as UserRole)) {
      throw new ForbiddenError('Acesso negado');
    }
  };
}
