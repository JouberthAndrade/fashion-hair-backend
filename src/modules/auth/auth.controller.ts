import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';
import {
  loginService,
  refreshTokenService,
  logoutService,
} from './auth.service.js';

export async function loginController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = loginSchema.parse(request.body);
  const { prisma } = request.server;

  const result = await loginService(request.server, prisma, body.email, body.password, {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  return reply.status(200).send(result);
}

export async function refreshTokenController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = refreshTokenSchema.parse(request.body);
  const { prisma } = request.server;

  const result = await refreshTokenService(request.server, prisma, body.refreshToken, {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  return reply.status(200).send(result);
}

export async function logoutController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = refreshTokenSchema.parse(request.body);
  const { prisma } = request.server;

  await logoutService(prisma, body.refreshToken);

  return reply.status(200).send({ message: 'Logout realizado com sucesso' });
}

export async function meController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { prisma } = request.server;
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      collaboratorProfile: {
        select: {
          specialty: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });

  return reply.status(200).send(user);
}
