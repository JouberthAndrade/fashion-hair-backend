import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import {
  listCollaboratorsController,
  getCollaboratorController,
  upsertProfileController,
  upsertWorkingHoursController,
  getWorkingHoursController,
} from './collaborators.controller.js';

export async function collaboratorsRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAuth] }, listCollaboratorsController);
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, getCollaboratorController);
  fastify.put<{ Params: { id: string } }>('/:id/profile', { preHandler: [requireAuth] }, upsertProfileController);
  fastify.get<{ Params: { id: string } }>('/:id/working-hours', { preHandler: [requireAuth] }, getWorkingHoursController);
  fastify.put<{ Params: { id: string } }>('/:id/working-hours', { preHandler: [requireAuth] }, upsertWorkingHoursController);
}
