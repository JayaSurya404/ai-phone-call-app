import type { FastifyPluginAsync } from 'fastify';

import type { DependencyManager } from '../infrastructure/dependency-manager.js';

interface HealthRouteOptions {
  dependencies: DependencyManager;
}

interface LivenessResponse {
  status: 'ok';
  service: 'voicenexus-api';
  timestamp: string;
  uptimeSeconds: number;
}

type DependencyStatus =
  | 'ready'
  | 'unavailable';

interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  service: 'voicenexus-api';
  timestamp: string;
  checks: {
    api: 'ready';
    postgresql: DependencyStatus;
    redis: DependencyStatus;
  };
}

const livenessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'service',
    'timestamp',
    'uptimeSeconds',
  ],
  properties: {
    status: {
      type: 'string',
      const: 'ok',
    },
    service: {
      type: 'string',
      const: 'voicenexus-api',
    },
    timestamp: {
      type: 'string',
    },
    uptimeSeconds: {
      type: 'number',
      minimum: 0,
    },
  },
} as const;

const readinessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'service',
    'timestamp',
    'checks',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['ready', 'not_ready'],
    },
    service: {
      type: 'string',
      const: 'voicenexus-api',
    },
    timestamp: {
      type: 'string',
    },
    checks: {
      type: 'object',
      additionalProperties: false,
      required: [
        'api',
        'postgresql',
        'redis',
      ],
      properties: {
        api: {
          type: 'string',
          const: 'ready',
        },
        postgresql: {
          type: 'string',
          enum: ['ready', 'unavailable'],
        },
        redis: {
          type: 'string',
          enum: ['ready', 'unavailable'],
        },
      },
    },
  },
} as const;

function getDependencyStatus(
  result: PromiseSettledResult<void>
): DependencyStatus {
  return result.status === 'fulfilled'
    ? 'ready'
    : 'unavailable';
}

export const healthRoutes: FastifyPluginAsync<
  HealthRouteOptions
> = async (app, options) => {
  app.get<{ Reply: LivenessResponse }>(
    '/health/live',
    {
      schema: {
        response: {
          200: livenessResponseSchema,
        },
      },
    },
    async () => ({
      status: 'ok',
      service: 'voicenexus-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    })
  );

  app.get<{ Reply: ReadinessResponse }>(
    '/health/ready',
    {
      schema: {
        response: {
          200: readinessResponseSchema,
          503: readinessResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const [postgresResult, redisResult] =
        await Promise.allSettled([
          options.dependencies.checkPostgresql(),
          options.dependencies.checkRedis(),
        ]);

      const postgresql =
        getDependencyStatus(postgresResult);

      const redis =
        getDependencyStatus(redisResult);

      const ready =
        postgresql === 'ready' &&
        redis === 'ready';

      if (!ready) {
        app.log.warn(
          {
            postgresql:
              postgresResult.status === 'rejected'
                ? postgresResult.reason
                : undefined,

            redis:
              redisResult.status === 'rejected'
                ? redisResult.reason
                : undefined,
          },
          'Dependency readiness check failed'
        );
      }

      const response: ReadinessResponse = {
        status: ready ? 'ready' : 'not_ready',
        service: 'voicenexus-api',
        timestamp: new Date().toISOString(),
        checks: {
          api: 'ready',
          postgresql,
          redis,
        },
      };

      return reply
        .status(ready ? 200 : 503)
        .send(response);
    }
  );
};