import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { comparePassword } from '../../shared/utils/password.js';
import { UnauthorizedError } from '../../shared/errors/index.js';
import { env } from '../../config/env.js';

// HMAC-SHA256 keyed with JWT_REFRESH_SECRET. A DB dump alone is not enough to
// forge tokens because the attacker still needs the server-side secret.
function hashToken(token: string): string {
  return crypto
    .createHmac('sha256', env.JWT_REFRESH_SECRET)
    .update(token)
    .digest('hex');
}

const EXPIRY_UNITS_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

function parseExpiry(expiry: string): Date {
  const match = /^(\d+)([smhdw])$/.exec(expiry.trim());
  if (!match) {
    throw new Error(`Invalid expiry format: "${expiry}" (expected e.g. "15m", "7d")`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return new Date(Date.now() + value * EXPIRY_UNITS_MS[unit]);
}

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export async function loginService(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  email: string,
  password: string,
  meta: SessionMeta,
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
  meta: SessionMeta,
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
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
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
