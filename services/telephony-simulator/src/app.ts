import fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type {
  SessionManager,
} from './services/session-manager.js';

import {
  healthRoutes,
} from './routes/health.js';

import {
  sessionRoutes,
} from './routes/sessions.js';

export interface BuildSimulatorAppOptions {
  serverOptions?:
    FastifyServerOptions;
  internalToken: string;
  sessions: SessionManager;
}

function getStatusCode(
  error: unknown
): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode ===
      'number' &&
    Number.isInteger(
      error.statusCode
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode;
  }

  return 500;
}

function getErrorName(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.name.trim() !== ''
  ) {
    return error.name;
  }

  return 'Error';
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim() !== ''
  ) {
    return error.message;
  }

  return (
    'The simulator request ' +
    'could not be completed.'
  );
}

export function buildSimulatorApp(
  options:
    BuildSimulatorAppOptions
): FastifyInstance {
  const app = fastify(
    options.serverOptions ?? {}
  );

  app.register(healthRoutes, {
    prefix: '/internal/v1',
  });

  app.register(sessionRoutes, {
    prefix:
      '/internal/v1/sessions',
    internalToken:
      options.internalToken,
    sessions: options.sessions,
  });

  app.addHook(
    'onClose',
    async () => {
      await options.sessions.close();
    }
  );

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
    async (
      error,
      request,
      reply
    ) => {
      const statusCode =
        getStatusCode(error);

      request.log.error(
        {
          error,
          method: request.method,
          url: request.url,
        },
        'Simulator request failed'
      );

      return reply
        .status(statusCode)
        .send({
          statusCode,
          error:
            statusCode >= 500
              ? 'Internal Server Error'
              : getErrorName(error),
          message:
            statusCode >= 500
              ? 'An unexpected simulator error occurred.'
              : getErrorMessage(error),
        });
    }
  );

  return app;
}