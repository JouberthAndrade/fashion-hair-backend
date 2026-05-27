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

export async function appointmentsRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [requireAuth] }, createAppointmentController);
  fastify.get<{ Querystring: { date?: string } }>('/my', { preHandler: [requireAuth] }, listMyAppointmentsController);
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, getAppointmentController);
  fastify.patch<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, updateAppointmentController);
  fastify.patch<{ Params: { id: string } }>('/:id/status', { preHandler: [requireAuth] }, updateStatusController);
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, cancelAppointmentController);
}
