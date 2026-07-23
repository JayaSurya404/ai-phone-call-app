import type {
  FastifyPluginAsync,
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
} from '../modules/calls/provider-event-contracts.js';

import type {
  TelephonyProviderEventInput,
} from '../modules/calls/provider-event-contracts.js';

import {
  verifyWebhookSignature,
} from '../security/webhook-signature.js';

interface ProviderWebhookRouteOptions {
  orchestration:
    CallOrchestrationService;
  signingSecret: string;
  maxAgeSeconds: number;
}

interface SignatureHeaders {
  'x-voicenexus-timestamp'?:
    string;
  'x-voicenexus-signature'?:
    string;
}

export const providerWebhookRoutes:
FastifyPluginAsync<
  ProviderWebhookRouteOptions
> = async (app, options) => {
  app.post<{
    Headers:
      SignatureHeaders;
    Body:
      TelephonyProviderEventInput;
  }>(
    '/events',
    {
      schema: {
        headers: {
          type: 'object',

          properties: {
            'x-voicenexus-timestamp': {
              type: 'string',
            },

            'x-voicenexus-signature': {
              type: 'string',
            },
          },
        },

        body: {
          type: 'object',
          additionalProperties:
            false,

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
      verifyWebhookSignature(
        options.signingSecret,

        request.headers[
          'x-voicenexus-timestamp'
        ],

        request.headers[
          'x-voicenexus-signature'
        ],

        request.body,

        options.maxAgeSeconds
      );

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