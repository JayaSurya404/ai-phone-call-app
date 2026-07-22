import type { FastifyPluginAsync } from 'fastify';

interface LivenessResponse {
  status: 'ok';
  service: 'voicenexus-api';
  timestamp: string;
  uptimeSeconds: number;
}

interface ReadinessResponse {
  status: 'ready';
  service: 'voicenexus-api';
  timestamp: string;
  checks: {
    api: 'ready';
  };
}

const livenessResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'service', 'timestamp', 'uptimeSeconds'],
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
  required: ['status', 'service', 'timestamp', 'checks'],
  properties: {
    status: {
      type: 'string',
      const: 'ready',
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
      required: ['api'],
      properties: {
        api: {
          type: 'string',
          const: 'ready',
        },
      },
    },
  },
} as const;

export const healthRoutes: FastifyPluginAsync = async (app) => {
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
        },
      },
    },
    async () => ({
      status: 'ready',
      service: 'voicenexus-api',
      timestamp: new Date().toISOString(),
      checks: {
        api: 'ready',
      },
    })
  );
};