import fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import { healthRoutes } from './routes/health.js';

export function buildApp(
  options: FastifyServerOptions = {}
): FastifyInstance {
  const app = fastify(options);

  app.register(healthRoutes, {
    prefix: '/api/v1',
  });

  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} was not found.`,
    });
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(
      {
        error,
        method: request.method,
        url: request.url,
      },
      'Request failed'
    );

    const statusCode =
      typeof error.statusCode === 'number' && error.statusCode >= 400
        ? error.statusCode
        : 500;

    return reply.status(statusCode).send({
      statusCode,
      error:
        statusCode >= 500
          ? 'Internal Server Error'
          : error.name,
      message:
        statusCode >= 500
          ? 'An unexpected server error occurred.'
          : error.message,
    });
  });

  return app;
}