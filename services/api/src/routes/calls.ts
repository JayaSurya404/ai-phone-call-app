import type {
  FastifyPluginAsync,
} from 'fastify';

import {
  CallStatus,
  SentimentLabel,
  TranscriptSpeaker,
} from '../generated/prisma/client.ts';

import type {
  AddTranscriptSegmentInput,
  CallSessionListItemDto,
  CallSessionService,
  ChangeCallStatusInput,
  CreateCallSessionInput,
  FinalizeCallInput,
  UpdateDraftCallInput,
} from '../modules/calls/call-session-service.js';

interface CallRouteOptions {
  calls: CallSessionService;
}

interface CallParams {
  id: string;
}

interface CallListQuery {
  limit?: number;
}

const uuidPattern =
  '^[0-9a-fA-F]{8}-' +
  '[0-9a-fA-F]{4}-' +
  '[1-5][0-9a-fA-F]{3}-' +
  '[89abAB][0-9a-fA-F]{3}-' +
  '[0-9a-fA-F]{12}$';

const callParamsSchema = {
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

const nullableUuidSchema = {
  anyOf: [
    {
      type: 'string',
      pattern: uuidPattern,
    },
    {
      type: 'null',
    },
  ],
} as const;

const createCallBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['destinationNumber'],

  properties: {
    destinationNumber: {
      type: 'string',
      minLength: 3,
      maxLength: 32,
      pattern: '\\S',
    },

    promptTemplateId:
      nullableUuidSchema,

    promptText: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
    },

    languageCode: {
      type: 'string',
      minLength: 2,
      maxLength: 16,
      pattern:
        '^[A-Za-z]{2,3}([_-][A-Za-z]{2,4})?$',
    },
  },

  anyOf: [
    {
      required: ['promptTemplateId'],
    },
    {
      required: ['promptText'],
    },
  ],
} as const;

const updateDraftBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,

  properties: {
    destinationNumber: {
      type: 'string',
      minLength: 3,
      maxLength: 32,
      pattern: '\\S',
    },

    promptTemplateId:
      nullableUuidSchema,

    promptText: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
    },

    languageCode: {
      type: 'string',
      minLength: 2,
      maxLength: 16,
    },
  },
} as const;

const changeStatusBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],

  properties: {
    status: {
      type: 'string',
      enum: Object.values(CallStatus),
    },

    provider: {
      anyOf: [
        {
          type: 'string',
          maxLength: 64,
        },
        {
          type: 'null',
        },
      ],
    },

    providerCallId: {
      anyOf: [
        {
          type: 'string',
          maxLength: 191,
        },
        {
          type: 'null',
        },
      ],
    },

    failureReason: {
      anyOf: [
        {
          type: 'string',
          maxLength: 5000,
        },
        {
          type: 'null',
        },
      ],
    },
  },
} as const;

const transcriptBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['speaker', 'content'],

  properties: {
    speaker: {
      type: 'string',
      enum: Object.values(
        TranscriptSpeaker
      ),
    },

    content: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
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
      enum: Object.values(
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
  },
} as const;

const finalizeBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'sentiment'],

  properties: {
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
    },

    sentiment: {
      type: 'string',
      enum: Object.values(
        SentimentLabel
      ),
    },
  },
} as const;

export const callRoutes:
FastifyPluginAsync<
  CallRouteOptions
> = async (app, options) => {
  app.get<{
    Querystring: CallListQuery;
    Reply: {
      items: CallSessionListItemDto[];
      count: number;
    };
  }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,

          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        },
      },
    },

    async (request) => {
      const items =
        await options.calls.list(
          request.query.limit ?? 20
        );

      return {
        items,
        count: items.length,
      };
    }
  );

  app.post<{
    Body: CreateCallSessionInput;
  }>(
    '/',
    {
      schema: {
        body: createCallBodySchema,
      },
    },

    async (request, reply) => {
      const created =
        await options.calls.create(
          request.body
        );

      return reply
        .status(201)
        .send(created);
    }
  );

  app.get<{
    Params: CallParams;
  }>(
    '/:id',
    {
      schema: {
        params: callParamsSchema,
      },
    },

    async (request) => {
      return options.calls.getById(
        request.params.id
      );
    }
  );

  app.patch<{
    Params: CallParams;
    Body: UpdateDraftCallInput;
  }>(
    '/:id',
    {
      schema: {
        params: callParamsSchema,
        body: updateDraftBodySchema,
      },
    },

    async (request) => {
      return options.calls.updateDraft(
        request.params.id,
        request.body
      );
    }
  );

  app.post<{
    Params: CallParams;
    Body: ChangeCallStatusInput;
  }>(
    '/:id/status',
    {
      schema: {
        params: callParamsSchema,
        body: changeStatusBodySchema,
      },
    },

    async (request) => {
      return options.calls.changeStatus(
        request.params.id,
        request.body
      );
    }
  );

  app.post<{
    Params: CallParams;
    Body: AddTranscriptSegmentInput;
  }>(
    '/:id/transcript',
    {
      schema: {
        params: callParamsSchema,
        body: transcriptBodySchema,
      },
    },

    async (request, reply) => {
      const created =
        await options.calls
          .addTranscriptSegment(
            request.params.id,
            request.body
          );

      return reply
        .status(201)
        .send(created);
    }
  );

  app.post<{
    Params: CallParams;
    Body: FinalizeCallInput;
  }>(
    '/:id/finalize',
    {
      schema: {
        params: callParamsSchema,
        body: finalizeBodySchema,
      },
    },

    async (request) => {
      return options.calls.finalize(
        request.params.id,
        request.body
      );
    }
  );

  app.delete<{
    Params: CallParams;
  }>(
    '/:id',
    {
      schema: {
        params: callParamsSchema,
      },
    },

    async (request) => {
      await options.calls.deleteDraft(
        request.params.id
      );

      return {
        deleted: true,
        id: request.params.id,
      };
    }
  );
};