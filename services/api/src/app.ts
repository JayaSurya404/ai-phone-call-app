import fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type {
  ActiveCallStore,
} from './infrastructure/active-call-store.js';

import type {
  DependencyManager,
} from './infrastructure/dependency-manager.js';

import type {
  TelephonyEventRepository,
} from './infrastructure/telephony-event-repository.js';

import type {
  CallOrchestrationService,
} from './modules/calls/call-orchestration-service.js';

import type {
  CallSessionService,
} from './modules/calls/call-session-service.js';

import type {
  PromptTemplateService,
} from './modules/prompt-templates/prompt-template-service.js';

import {
  callObservabilityRoutes,
} from './routes/call-observability.js';

import {
  callOperationRoutes,
} from './routes/call-operations.js';

import {
  callRoutes,
} from './routes/calls.js';

import {
  healthRoutes,
} from './routes/health.js';

import {
  internalTelephonyRoutes,
} from './routes/internal-telephony.js';

import {
  promptTemplateRoutes,
} from './routes/prompt-templates.js';

interface Closeable {
  close(): Promise<void>;
}

export interface BuildAppOptions {
  serverOptions?:
    FastifyServerOptions;
  dependencies:
    DependencyManager;
  promptTemplates?:
    PromptTemplateService;
  calls?: CallSessionService;
  orchestration?:
    CallOrchestrationService;
  internalApiToken?: string;
  activeCalls?: ActiveCallStore;
  telephonyEvents?:
    TelephonyEventRepository;
  closeables?: readonly Closeable[];
}

function getErrorStatusCode(
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
    dependencies:
      options.dependencies,
  });

  if (
    options.promptTemplates
  ) {
    app.register(
      promptTemplateRoutes,
      {
        prefix:
          '/api/v1/prompt-templates',
        promptTemplates:
          options.promptTemplates,
      }
    );
  }

  if (options.calls) {
    app.register(callRoutes, {
      prefix:
        '/api/v1/calls',
      calls: options.calls,
    });
  }

  if (options.orchestration) {
    app.register(
      callOperationRoutes,
      {
        prefix:
          '/api/v1/calls',
        orchestration:
          options.orchestration,
      }
    );
  }

  if (
    options.calls &&
    options.activeCalls &&
    options.telephonyEvents
  ) {
    app.register(
      callObservabilityRoutes,
      {
        prefix:
          '/api/v1/calls',
        calls: options.calls,
        activeCalls:
          options.activeCalls,
        events:
          options.telephonyEvents,
      }
    );
  }

  if (
    options.orchestration &&
    options.internalApiToken
  ) {
    app.register(
      internalTelephonyRoutes,
      {
        prefix:
          '/api/v1/internal/telephony',
        internalToken:
          options.internalApiToken,
        orchestration:
          options.orchestration,
      }
    );
  }

  app.addHook(
    'onClose',
    async () => {
      for (
        const closeable of
        options.closeables ?? []
      ) {
        await closeable.close();
      }

      await options.dependencies
        .close();
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
              ? 'An unexpected server error occurred.'
              : getErrorMessage(error),
        });
    }
  );

  return app;
}