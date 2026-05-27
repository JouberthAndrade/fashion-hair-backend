import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../shared/errors/AppError.js';
import { ZodError } from 'zod';

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    (error: FastifyError | AppError | Error, _request: FastifyRequest, reply: FastifyReply) => {
      // AppError (domain errors)
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: error.code,
          message: error.message,
          statusCode: error.statusCode,
        });
      }

      // Zod validation errors
      if (error instanceof ZodError) {
        return reply.status(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          statusCode: 422,
          details: error.flatten().fieldErrors,
        });
      }

      // Fastify validation errors (JSON Schema)
      if ('statusCode' in error && error.statusCode === 400) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: error.message,
          statusCode: 400,
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado',
          statusCode: 401,
        });
      }

      // Unknown errors
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
        statusCode: 500,
      });
    },
  );
}
