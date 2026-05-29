import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import {
  createAppointmentController,
  listMyAppointmentsController,
  getAppointmentController,
  updateAppointmentController,
  updateStatusController,
  cancelAppointmentController,
} from './appointments.controller.js';

const sec = [{ bearerAuth: [] }];

export async function appointmentsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    { schema: { tags: ['Appointments'], summary: 'Criar agendamento', security: sec }, preHandler: [requireAuth] },
    createAppointmentController,
  );
  fastify.get<{ Querystring: { date?: string } }>(
    '/my',
    { schema: { tags: ['Appointments'], summary: 'Minha agenda do dia', security: sec }, preHandler: [requireAuth] },
    listMyAppointmentsController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Appointments'], summary: 'Buscar agendamento', security: sec }, preHandler: [requireAuth] },
    getAppointmentController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Appointments'], summary: 'Reagendar', security: sec }, preHandler: [requireAuth] },
    updateAppointmentController,
  );
  fastify.patch<{ Params: { id: string } }>(
    '/:id/status',
    { schema: { tags: ['Appointments'], summary: 'Atualizar status', security: sec }, preHandler: [requireAuth] },
    updateStatusController,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Appointments'], summary: 'Cancelar', security: sec }, preHandler: [requireAuth] },
    cancelAppointmentController,
  );
}
