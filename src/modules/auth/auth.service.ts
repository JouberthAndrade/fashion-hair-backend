import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { comparePassword } from '../../shared/utils/password.js';
import { UnauthorizedError } from '../../shared/errors/index.js';
import { env } from '../../config/env.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiry(expiry: string): Date {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const now = new Date();
  if (unit === 'm') now.setMinutes(now.getMinutes() + value);
  else if (unit === 'h') now.setHours(now.getHours() + value);
  else if (unit === 'd') now.setDate(now.getDate() + value);
  return now;
}

export async function loginService(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  email: string,
  password: string,
  meta: { userAgent?: string; ipAddress?: string },
) {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, isActive: true },
  });

  if (!user) throw new UnauthorizedError('E-mail ou senha incorretos');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new UnauthorizedError('E-mail ou senha incorretos');

  const payload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });

  const rawRefresh = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(rawRefresh);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: parseExpiry(env.JWT_REFRESH_EXPIRY),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshTokenService(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  rawToken: string,
) {
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !stored ||
    stored.revokedAt !== null ||
    stored.expiresAt < new Date()
  ) {
    throw new UnauthorizedError('Refresh token inválido ou expirado');
  }

  if (!stored.user.isActive || stored.user.deletedAt !== null) {
    throw new UnauthorizedError('Usuário inativo');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const payload = {
    sub: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });

  const newRawRefresh = crypto.randomBytes(64).toString('hex');
  const newHash = hashToken(newRawRefresh);

  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: newHash,
      expiresAt: parseExpiry(env.JWT_REFRESH_EXPIRY),
    },
  });

  return { accessToken, refreshToken: newRawRefresh };
}

export async function logoutService(
  prisma: PrismaClient,
  rawToken: string,
) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
