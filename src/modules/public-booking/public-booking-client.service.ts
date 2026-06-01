import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { ValidationError } from '../../shared/errors/index.js';
import {
  decidePublicClientIdentity,
  digitsOnlyPhone,
  normalizeEmail,
  type PublicClientInput,
} from '../../shared/utils/clientIdentity.js';

async function findActiveClientByEmail(prisma: PrismaClient, email: string) {
  return prisma.client.findFirst({
    where: {
      deletedAt: null,
      email: { equals: normalizeEmail(email), mode: 'insensitive' },
    },
    select: { id: true, name: true, phone: true, email: true },
  });
}

async function findActiveClientByPhone(prisma: PrismaClient, phone: string) {
  const exact = await prisma.client.findFirst({
    where: { deletedAt: null, phone: phone.trim() },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (exact) return exact;

  const digits = digitsOnlyPhone(phone);
  if (digits.length < 8) return null;

  const suffix = digits.slice(-8);
  const candidates = await prisma.client.findMany({
    where: {
      deletedAt: null,
      phone: { contains: suffix },
    },
    select: { id: true, name: true, phone: true, email: true },
  });

  return candidates.find((c) => digitsOnlyPhone(c.phone) === digits) ?? null;
}

export async function resolvePublicBookingClient(
  prisma: PrismaClient,
  data: PublicClientInput,
  marketingOptIn: boolean,
) {
  const [byPhone, byEmail] = await Promise.all([
    findActiveClientByPhone(prisma, data.phone),
    findActiveClientByEmail(prisma, data.email),
  ]);

  const decision = decidePublicClientIdentity(data, byPhone, byEmail);

  if (decision.type === 'reject') {
    throw new ValidationError(decision.message);
  }

  const consentUpdate = {
    privacyPolicyVersion: env.PRIVACY_POLICY_VERSION,
    privacyConsentedAt: new Date(),
    marketingOptIn,
    bookingSource: 'PUBLIC_WEB',
  };

  if (decision.type === 'reuse') {
    return prisma.client.update({
      where: { id: decision.clientId },
      data: {
        ...consentUpdate,
        ...(decision.fillEmail ? { email: decision.fillEmail } : {}),
      },
    });
  }

  try {
    return await prisma.client.create({
      data: {
        name: decision.name,
        phone: decision.phone,
        email: decision.email,
        ...consentUpdate,
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') {
      throw new ValidationError('Este e-mail já está em uso. Verifique seus dados ou fale com o salão.');
    }
    throw err;
  }
}
