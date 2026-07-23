import type {
  FastifyPluginAsync,
  FastifyRequest,
} from 'fastify';

import {
  SentimentLabel,
  TranscriptSpeaker,
} from '../generated/prisma/client.ts';

import type {
  CallOrchestrationService,
} from '../modules/calls/call-orchestration-service.js';

import {
  providerEventTypes,
  type TelephonyProviderEventInput,
} from '../modules/calls/provider-event-contracts.js';

interface InternalTelephonyRouteOptions {
  internalToken: string;
  orchestration:
    CallOrchestrationService;
}

function authorize(
  request: FastifyRequest,
  token: string
): void {
  if (
    request.headers.authorization !==
    `Bearer ${token}`
  ) {
    const error = new Error(
      'A valid internal API token is required.'
    );

    Object.assign(error, {
      name:
        'InternalApiUnauthorizedError',
      statusCode: 401,
    });

    throw error;
  }
}

export const internalTelephonyRoutes:
FastifyPluginAsync<
  InternalTelephonyRouteOptions
> = async (app, options) => {
  app.addHook(
    'preHandler',
    async (request) => {
      authorize(
        request,
        options.internalToken
      );
    }
  );

  app.post<{
    Body:
      TelephonyProviderEventInput;
  }>(
    '/events',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'eventId',
            'sessionId',
            'callSessionId',
            'occurredAt',
            'type',
          ],
          properties: {
            eventId: {
              type: 'string',
              minLength: 1,
              maxLength: 191,
            },
            sessionId: {
              type: 'string',
              minLength: 1,
              maxLength: 191,
            },
            callSessionId: {
              type: 'string',
              minLength: 1,
            },
            occurredAt: {
              type: 'string',
              format: 'date-time',
            },
            type: {
              type: 'string',
              enum:
                providerEventTypes,
            },
            speaker: {
              type: 'string',
              enum:
                Object.values(
                  TranscriptSpeaker
                ),
            },
            content: {
              type: 'string',
            },
            confidence: {
              anyOf: [
                {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                },
                {
                  type: 'null',
                },
              ],
            },
            sentiment: {
              type: 'string',
              enum:
                Object.values(
                  SentimentLabel
                ),
            },
            latencyMs: {
              anyOf: [
                {
                  type: 'integer',
                  minimum: 0,
                },
                {
                  type: 'null',
                },
              ],
            },
            startedAtMs: {
              anyOf: [
                {
                  type: 'integer',
                  minimum: 0,
                },
                {
                  type: 'null',
                },
              ],
            },
            endedAtMs: {
              anyOf: [
                {
                  type: 'integer',
                  minimum: 0,
                },
                {
                  type: 'null',
                },
              ],
            },
            summary: {
              type: 'string',
            },
            reason: {
              type: 'string',
            },
          },
        },
      },
    },
    async (request) => {
      const result =
        await options.orchestration
          .handleProviderEvent(
            request.body
          );

      return {
        accepted: true,
        duplicate:
          result.duplicate,
        call: result.call,
      };
    }
  );
};