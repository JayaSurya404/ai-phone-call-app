import type {
  FastifyPluginAsync,
} from 'fastify';

import {
  simulatorScenarioIds,
} from '../infrastructure/telephony-simulator-client.js';

import type {
  CallOrchestrationService,
  StartCallInput,
} from '../modules/calls/call-orchestration-service.js';

interface CallOperationRouteOptions {
  orchestration:
    CallOrchestrationService;
}

interface CallParams {
  id: string;
}

const uuidPattern =
  '^[0-9a-fA-F]{8}-' +
  '[0-9a-fA-F]{4}-' +
  '[1-5][0-9a-fA-F]{3}-' +
  '[89abAB][0-9a-fA-F]{3}-' +
  '[0-9a-fA-F]{12}$';

const paramsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: uuidPattern,
    },
  },
} as const;

export const callOperationRoutes:
FastifyPluginAsync<
  CallOperationRouteOptions
> = async (app, options) => {
  app.post<{
    Params: CallParams;
    Body: StartCallInput;
  }>(
    '/:id/start',
    {
      schema: {
        params: paramsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            scenarioId: {
              type: 'string',
              enum:
                simulatorScenarioIds,
            },
          },
        },
      },
    },
    async (request) => {
      return options.orchestration.start(
        request.params.id,
        request.body
      );
    }
  );

  app.post<{
    Params: CallParams;
  }>(
    '/:id/cancel',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request) => {
      return options.orchestration.cancel(
        request.params.id
      );
    }
  );
};