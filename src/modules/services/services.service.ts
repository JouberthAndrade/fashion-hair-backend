import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/index.js';
import { CreateServiceBody, UpdateServiceBody } from './services.schema.js';

export async function listServicesService(
  prisma: PrismaClient,
  onlyActive = true,
) {
  return prisma.service.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: { name: 'asc' },
  });
}

export async function getServiceByIdService(prisma: PrismaClient, id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new NotFoundError('Serviço não encontrado');
  return service;
}

export async function createServiceService(
  prisma: PrismaClient,
  data: CreateServiceBody,
) {
  return prisma.service.create({ data });
}

export async function updateServiceService(
  prisma: PrismaClient,
  id: string,
  data: UpdateServiceBody,
) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new NotFoundError('Serviço não encontrado');
  return prisma.service.update({ where: { id }, data });
}

export async function deleteServiceService(prisma: PrismaClient, id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new NotFoundError('Serviço não encontrado');
  await prisma.service.update({ where: { id }, data: { isActive: false } });
}
