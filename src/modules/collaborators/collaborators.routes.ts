import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';
import {
  listCollaboratorsController,
  getCollaboratorController,
  upsertProfileController,
  upsertWorkingHoursController,
  getWorkingHoursController,
} from './collaborators.controller.js';

const sec = [{ bearerAuth: [] }];

export async function collaboratorsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { schema: { tags: ['Collaborators'], summary: 'Listar colaboradores ativos (admin)', security: sec }, preHandler: [requireAuth, requireRole('ADMIN')] },
    listCollaboratorsController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { tags: ['Collaborators'], summary: 'Buscar colaborador', security: sec }, preHandler: [requireAuth] },
    getCollaboratorController,
  );
  fastify.put<{ Params: { id: string } }>(
    '/:id/profile',
    { schema: { tags: ['Collaborators'], summary: 'Atualizar perfil/especialidade', security: sec }, preHandler: [requireAuth] },
    upsertProfileController,
  );
  fastify.get<{ Params: { id: string } }>(
    '/:id/working-hours',
    { schema: { tags: ['Collaborators'], summary: 'Horários de trabalho', security: sec }, preHandler: [requireAuth] },
    getWorkingHoursController,
  );
  fastify.put<{ Params: { id: string } }>(
    '/:id/working-hours',
    { schema: { tags: ['Collaborators'], summary: 'Definir horários de trabalho', security: sec }, preHandler: [requireAuth] },
    upsertWorkingHoursController,
  );
}
