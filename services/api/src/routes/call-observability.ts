import type {
  FastifyPluginAsync,
} from 'fastify';

import type {
  ActiveCallStore,
} from '../infrastructure/active-call-store.js';

import type {
  TelephonyEventRepository,
} from '../infrastructure/telephony-event-repository.js';

import type {
  CallSessionService,
} from '../modules/calls/call-session-service.js';

interface CallObservabilityOptions {
  calls: CallSessionService;
  activeCalls: ActiveCallStore;
  events:
    TelephonyEventRepository;
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

export const callObservabilityRoutes:
FastifyPluginAsync<
  CallObservabilityOptions
> = async (app, options) => {
  app.get<{
    Params: CallParams;
  }>(
    '/:id/events',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request) => {
      await options.calls.getById(
        request.params.id
      );

      const items =
        await options.events
          .listByCall(
            request.params.id
          );

      return {
        items,
        count: items.length,
      };
    }
  );

  app.get<{
    Params: CallParams;
  }>(
    '/:id/runtime',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request) => {
      const call =
        await options.calls.getById(
          request.params.id
        );

      const activeState =
        await options.activeCalls
          .get(request.params.id);

      return {
        call,
        activeState,
      };
    }
  );
};