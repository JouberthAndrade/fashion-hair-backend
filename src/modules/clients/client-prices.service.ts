import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/index.js';
import { decimalToNumber, resolveAppointmentPrice } from '../../shared/utils/salonFee.js';

async function ensureClient(prisma: PrismaClient, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, deletedAt: null },
  });
  if (!client) throw new NotFoundError('Cliente não encontrado');
  return client;
}

/** Lista o price book do cliente (preços negociados por serviço). */
export async function listClientServicePricesService(
  prisma: PrismaClient,
  clientId: string,
) {
  await ensureClient(prisma, clientId);

  const prices = await prisma.clientServicePrice.findMany({
    where: { clientId },
    orderBy: { service: { name: 'asc' } },
    include: { service: { select: { id: true, name: true, price: true } } },
  });

  return prices.map((p) => ({
    serviceId: p.serviceId,
    serviceName: p.service.name,
    price: decimalToNumber(p.price),
    standardPrice: decimalToNumber(p.service.price),
    updatedById: p.updatedById,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

/** Resolve o preço sugerido para (cliente, serviço): book ou padrão. */
export async function resolveClientServicePriceService(
  prisma: PrismaClient,
  clientId: string,
  serviceId: string,
) {
  await ensureClient(prisma, clientId);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw new NotFoundError('Serviço não encontrado ou inativo');
  }

  const resolved = await resolveAppointmentPrice(prisma, clientId, service);
  return {
    serviceId: service.id,
    serviceName: service.name,
    price: resolved.price,
    standardPrice: resolved.standardPrice,
    source: resolved.source === 'book' ? 'book' : 'standard',
  };
}

/** Cria ou atualiza o preço lembrado de um cliente para um serviço. */
export async function upsertClientServicePriceService(
  prisma: PrismaClient,
  clientId: string,
  serviceId: string,
  price: number,
  userId?: string,
) {
  await ensureClient(prisma, clientId);

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new NotFoundError('Serviço não encontrado');

  const saved = await prisma.clientServicePrice.upsert({
    where: { clientId_serviceId: { clientId, serviceId } },
    create: { clientId, serviceId, price, updatedById: userId ?? null },
    update: { price, updatedById: userId ?? null },
    include: { service: { select: { name: true, price: true } } },
  });

  return {
    serviceId: saved.serviceId,
    serviceName: saved.service.name,
    price: decimalToNumber(saved.price),
    standardPrice: decimalToNumber(saved.service.price),
    updatedById: saved.updatedById,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

/** Remove o preço lembrado (volta a sugerir o preço padrão do serviço). */
export async function deleteClientServicePriceService(
  prisma: PrismaClient,
  clientId: string,
  serviceId: string,
) {
  const { count } = await prisma.clientServicePrice.deleteMany({
    where: { clientId, serviceId },
  });
  if (count === 0) {
    throw new NotFoundError('Preço não encontrado para este cliente e serviço');
  }
}
