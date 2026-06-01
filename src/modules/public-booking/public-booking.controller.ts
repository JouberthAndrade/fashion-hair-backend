import { FastifyReply, FastifyRequest } from 'fastify';
import {
  availabilityQuerySchema,
  createPublicAppointmentSchema,
  listCollaboratorsQuerySchema,
} from './public-booking.schema.js';
import {
  createPublicAppointmentService,
  getAvailabilityService,
  getPrivacyPolicyService,
  listPublicCollaboratorsService,
  listPublicServicesService,
} from './public-booking.service.js';

export async function listPublicServicesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const services = await listPublicServicesService(request.server.prisma);
  return reply.send(services);
}

export async function listPublicCollaboratorsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = listCollaboratorsQuerySchema.parse(request.query);
  const collaborators = await listPublicCollaboratorsService(
    request.server.prisma,
    query.serviceId,
  );
  return reply.send(collaborators);
}

export async function getAvailabilityController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = availabilityQuerySchema.parse(request.query);
  const result = await getAvailabilityService(request.server.prisma, query);
  return reply.send(result);
}

export async function createPublicAppointmentController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createPublicAppointmentSchema.parse(request.body);
  const result = await createPublicAppointmentService(
    request.server.prisma,
    request.server.redis,
    body,
  );
  return reply.status(201).send(result);
}

export async function getPrivacyPolicyController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.send(getPrivacyPolicyService());
}
