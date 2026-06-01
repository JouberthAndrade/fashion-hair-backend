import { FastifyInstance } from 'fastify';
import {
  createPublicAppointmentController,
  getAvailabilityController,
  getPrivacyPolicyController,
  listPublicCollaboratorsController,
  listPublicServicesController,
} from './public-booking.controller.js';

export async function publicBookingRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/services',
    { schema: { tags: ['PublicBooking'], summary: 'Catálogo público de serviços' } },
    listPublicServicesController,
  );

  fastify.get(
    '/collaborators',
    {
      schema: {
        tags: ['PublicBooking'],
        summary: 'Profissionais compatíveis com o serviço',
        querystring: {
          type: 'object',
          required: ['serviceId'],
          properties: { serviceId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    listPublicCollaboratorsController,
  );

  fastify.get(
    '/availability',
    {
      schema: {
        tags: ['PublicBooking'],
        summary: 'Horários livres para colaborador + serviço + data',
        querystring: {
          type: 'object',
          required: ['collaboratorId', 'serviceId', 'date'],
          properties: {
            collaboratorId: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    getAvailabilityController,
  );

  fastify.post(
    '/appointments',
    {
      schema: { tags: ['PublicBooking'], summary: 'Criar agendamento público (LGPD)' },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    createPublicAppointmentController,
  );

  fastify.get(
    '/privacy-policy',
    { schema: { tags: ['PublicBooking'], summary: 'Política de privacidade versionada' } },
    getPrivacyPolicyController,
  );
}
