import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/index.js';
import { CreateClientBody, UpdateClientBody } from './clients.schema.js';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';

export async function listClientsService(
  prisma: PrismaClient,
  query: { page?: number; limit?: number; search?: string; phone?: string },
) {
  const { page, limit, skip } = getPaginationParams(query);

  const where = {
    deletedAt: null,
    ...(query.phone
      ? { phone: { contains: query.phone } }
      : query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { phone: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, meta: buildPaginationMeta(total, page, limit) };
}

export async function getClientByIdService(prisma: PrismaClient, id: string) {
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      appointments: {
        where: { deletedAt: null },
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        select: {
          id: true,
          scheduledDate: true,
          startTime: true,
          endTime: true,
          status: true,
          service: { select: { name: true } },
          collaborator: { select: { name: true } },
        },
      },
    },
  });
  if (!client) throw new NotFoundError('Cliente não encontrado');
  return client;
}

export async function createClientService(
  prisma: PrismaClient,
  data: CreateClientBody,
) {
  return prisma.client.create({ data });
}

export async function updateClientService(
  prisma: PrismaClient,
  id: string,
  data: UpdateClientBody,
) {
  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) throw new NotFoundError('Cliente não encontrado');
  return prisma.client.update({ where: { id }, data });
}

export async function deleteClientService(prisma: PrismaClient, id: string) {
  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) throw new NotFoundError('Cliente não encontrado');
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function findOrCreateClientService(
  prisma: PrismaClient,
  data: CreateClientBody,
) {
  const existing = await prisma.client.findFirst({
    where: { phone: data.phone, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.client.create({ data });
}
