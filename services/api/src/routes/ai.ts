import type {
  FastifyPluginAsync,
} from 'fastify';

import type {
  AiProviderRegistry,
} from '../modules/ai/contracts.js';

import type {
  AiTurnService,
  ProcessAiTurnInput,
} from '../modules/ai/ai-turn-service.js';

interface AiRouteOptions {
  providers:
    AiProviderRegistry;
  aiTurns:
    AiTurnService;
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

export const aiRoutes:
FastifyPluginAsync<
  AiRouteOptions
> = async (app, options) => {
  app.get(
    '/providers',
    async () => {
      return options.providers
        .health();
    }
  );

  app.post<{
    Params: CallParams;
    Body: ProcessAiTurnInput;
  }>(
    '/calls/:id/turn',
    {
      schema: {
        params:
          paramsSchema,

        body: {
          type: 'object',
          additionalProperties: false,

          properties: {
            remoteText: {
              type: 'string',
              minLength: 1,
              maxLength: 20_000,
            },

            audioBase64: {
              type: 'string',
              minLength: 1,
            },

            audioMimeType: {
              type: 'string',
              minLength: 3,
              maxLength: 120,
            },

            languageCode: {
              type: 'string',
              minLength: 2,
              maxLength: 16,
            },

            voice: {
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120,
                },
                {
                  type: 'null',
                },
              ],
            },
          },

          anyOf: [
            {
              required: [
                'remoteText',
              ],
            },
            {
              required: [
                'audioBase64',
              ],
            },
          ],
        },
      },
    },

    async (request) => {
      return options.aiTurns
        .process(
          request.params.id,
          request.body
        );
    }
  );
};