import fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type { DependencyManager } from './infrastructure/dependency-manager.js';
import { healthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  serverOptions?: FastifyServerOptions;
  dependencies: DependencyManager;
}

function getErrorStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode;
  }

  return 500;
}

function getErrorName(error: unknown): string {
  if (
    error instanceof Error &&
    error.name.trim() !== ''
  ) {
    return error.name;
  }

  return 'Error';
}

function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim() !== ''
  ) {
    return error.message;
  }

  return 'The request could not be completed.';
}

export function buildApp(
  options: BuildAppOptions
): FastifyInstance {
  const app = fastify(
    options.serverOptions ?? {}
  );

  app.register(healthRoutes, {
    prefix: '/api/v1',
    dependencies: options.dependencies,
  });

  app.addHook('onClose', async () => {
    await options.dependencies.close();
  });

  app.setNotFoundHandler(
    async (request, reply) => {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message:
          `Route ${request.method} ` +
          `${request.url} was not found.`,
      });
    }
  );

  app.setErrorHandler(
    async (error, request, reply) => {
      request.log.error(
        {
          error,
          method: request.method,
          url: request.url,
        },
        'Request failed'
      );

      const statusCode =
        getErrorStatusCode(error);

      return reply.status(statusCode).send({
        statusCode,

        error:
          statusCode >= 500
            ? 'Internal Server Error'
            : getErrorName(error),

        message:
          statusCode >= 500
            ? 'An unexpected server error occurred.'
            : getErrorMessage(error),
      });
    }
  );

  return app;
}