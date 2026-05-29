import { FastifyRequest, FastifyReply } from 'fastify';
import { upsertClientPriceSchema } from './client-prices.schema.js';
import {
  listClientServicePricesService,
  resolveClientServicePriceService,
  upsertClientServicePriceService,
  deleteClientServicePriceService,
} from './client-prices.service.js';

export async function listClientPricesController(
  request: FastifyRequest<{ Params: { clientId: string } }>,
  reply: FastifyReply,
) {
  const result = await listClientServicePricesService(
    request.server.prisma,
    request.params.clientId,
  );
  return reply.status(200).send(result);
}

export async function resolveClientPriceController(
  request: FastifyRequest<{ Params: { clientId: string; serviceId: string } }>,
  reply: FastifyReply,
) {
  const result = await resolveClientServicePriceService(
    request.server.prisma,
    request.params.clientId,
    request.params.serviceId,
  );
  return reply.status(200).send(result);
}

export async function upsertClientPriceController(
  request: FastifyRequest<{ Params: { clientId: string; serviceId: string } }>,
  reply: FastifyReply,
) {
  const body = upsertClientPriceSchema.parse(request.body);
  const result = await upsertClientServicePriceService(
    request.server.prisma,
    request.params.clientId,
    request.params.serviceId,
    body.price,
    request.user.sub,
  );
  return reply.status(200).send(result);
}

export async function deleteClientPriceController(
  request: FastifyRequest<{ Params: { clientId: string; serviceId: string } }>,
  reply: FastifyReply,
) {
  await deleteClientServicePriceService(
    request.server.prisma,
    request.params.clientId,
    request.params.serviceId,
  );
  return reply.status(204).send();
}
