import assert from 'node:assert/strict';

import {
  randomUUID,
} from 'node:crypto';

import test from 'node:test';

import {
  buildApp,
} from '../src/app.js';

import {
  CallStatus,
  SentimentLabel,
  TranscriptSpeaker,
} from '../src/generated/prisma/client.ts';

import type {
  DependencyManager,
} from '../src/infrastructure/dependency-manager.js';

import {
  CallFinalizeNotAllowedError,
  CallNotDeletableError,
  CallNotEditableError,
  CallSessionNotFoundError,
  CallTranscriptNotAllowedError,
  InvalidCallTransitionError,
  type AddTranscriptSegmentInput,
  type CallSessionDto,
  type CallSessionListItemDto,
  type CallSessionService,
  type ChangeCallStatusInput,
  type CreateCallSessionInput,
  type FinalizeCallInput,
  type TranscriptSegmentDto,
  type UpdateDraftCallInput,
} from '../src/modules/calls/call-session-service.js';

function createDependencies():
DependencyManager {
  return {
    async checkPostgresql() {
      return Promise.resolve();
    },

    async checkRedis() {
      return Promise.resolve();
    },

    async close() {
      return Promise.resolve();
    },
  };
}

function createCallServiceStub():
CallSessionService {
  const calls =
    new Map<
      string,
      CallSessionDto
    >();

  function requireCall(
    id: string
  ): CallSessionDto {
    const call = calls.get(id);

    if (!call) {
      throw new CallSessionNotFoundError(
        id
      );
    }

    return call;
  }

  function updateStoredCall(
    call: CallSessionDto
  ): CallSessionDto {
    calls.set(call.id, call);

    return call;
  }

  return {
    async list(
      limit: number
    ): Promise<
      CallSessionListItemDto[]
    > {
      return [...calls.values()]
        .slice(0, limit)
        .map((call) => ({
          id: call.id,

          destinationNumber:
            call.destinationNumber,

          status: call.status,

          languageCode:
            call.languageCode,

          provider:
            call.provider,

          startedAt:
            call.startedAt,

          endedAt:
            call.endedAt,

          summary:
            call.summary,

          sentiment:
            call.sentiment,

          createdAt:
            call.createdAt,

          updatedAt:
            call.updatedAt,
        }));
    },

    async getById(
      id: string
    ) {
      return requireCall(id);
    },

    async create(
      input:
        CreateCallSessionInput
    ) {
      const timestamp =
        new Date().toISOString();

      const call:
      CallSessionDto = {
        id: randomUUID(),

        destinationNumber:
          input.destinationNumber,

        promptSnapshot:
          input.promptText ??
          'Template prompt',

        promptTemplateId:
          input.promptTemplateId ??
          null,

        status:
          CallStatus.DRAFT,

        languageCode:
          input.languageCode ??
          'en-IN',

        provider: null,
        providerCallId: null,
        startedAt: null,
        endedAt: null,
        summary: null,

        sentiment:
          SentimentLabel.UNKNOWN,

        failureReason: null,

        createdAt:
          timestamp,

        updatedAt:
          timestamp,

        transcriptSegments: [],
      };

      return updateStoredCall(call);
    },

    async updateDraft(
      id: string,

      input:
        UpdateDraftCallInput
    ) {
      const call =
        requireCall(id);

      if (
        call.status !==
        CallStatus.DRAFT
      ) {
        throw new CallNotEditableError(
          call.status
        );
      }

      return updateStoredCall({
        ...call,

        destinationNumber:
          input.destinationNumber ??
          call.destinationNumber,

        promptTemplateId:
          input.promptTemplateId !==
          undefined
            ? input.promptTemplateId
            : call.promptTemplateId,

        promptSnapshot:
          input.promptText ??
          call.promptSnapshot,

        languageCode:
          input.languageCode ??
          call.languageCode,

        updatedAt:
          new Date().toISOString(),
      });
    },

    async changeStatus(
      id: string,

      input:
        ChangeCallStatusInput
    ) {
      const call =
        requireCall(id);

      const validTransitions:
      Record<
        CallStatus,
        readonly CallStatus[]
      > = {
        DRAFT: [
          CallStatus.QUEUED,
          CallStatus.CANCELLED,
        ],

        QUEUED: [
          CallStatus.STARTING,
          CallStatus.CANCELLED,
          CallStatus.FAILED,
        ],

        STARTING: [
          CallStatus.RINGING,
          CallStatus.IN_PROGRESS,
          CallStatus.CANCELLED,
          CallStatus.FAILED,
        ],

        RINGING: [
          CallStatus.IN_PROGRESS,
          CallStatus.CANCELLED,
          CallStatus.FAILED,
        ],

        IN_PROGRESS: [
          CallStatus.COMPLETED,
          CallStatus.CANCELLED,
          CallStatus.FAILED,
        ],

        COMPLETED: [],
        FAILED: [],
        CANCELLED: [],
      };

      if (
        !validTransitions[
          call.status
        ].includes(input.status)
      ) {
        throw new InvalidCallTransitionError(
          call.status,
          input.status
        );
      }

      const isTerminalStatus =
        input.status ===
          CallStatus.COMPLETED ||
        input.status ===
          CallStatus.CANCELLED ||
        input.status ===
          CallStatus.FAILED;

      return updateStoredCall({
        ...call,

        status:
          input.status,

        provider:
          input.provider !== undefined
            ? input.provider
            : call.provider,

        providerCallId:
          input.providerCallId !==
          undefined
            ? input.providerCallId
            : call.providerCallId,

        failureReason:
          input.failureReason !==
          undefined
            ? input.failureReason
            : call.failureReason,

        startedAt:
          input.status ===
          CallStatus.IN_PROGRESS
            ? new Date().toISOString()
            : call.startedAt,

        endedAt:
          isTerminalStatus
            ? new Date().toISOString()
            : call.endedAt,

        updatedAt:
          new Date().toISOString(),
      });
    },

    async addTranscriptSegment(
      id: string,

      input:
        AddTranscriptSegmentInput
    ): Promise<TranscriptSegmentDto> {
      const call =
        requireCall(id);

      if (
        call.status !==
          CallStatus.RINGING &&
        call.status !==
          CallStatus.IN_PROGRESS
      ) {
        throw new CallTranscriptNotAllowedError(
          call.status
        );
      }

      const segment:
      TranscriptSegmentDto = {
        id: randomUUID(),

        callSessionId:
          id,

        sequence:
          call.transcriptSegments
            .length + 1,

        speaker:
          input.speaker,

        content:
          input.content,

        confidence:
          input.confidence ??
          null,

        sentiment:
          input.sentiment ??
          SentimentLabel.UNKNOWN,

        latencyMs:
          input.latencyMs ??
          null,

        startedAtMs:
          input.startedAtMs ??
          null,

        endedAtMs:
          input.endedAtMs ??
          null,

        createdAt:
          new Date().toISOString(),
      };

      updateStoredCall({
        ...call,

        transcriptSegments: [
          ...call.transcriptSegments,
          segment,
        ],
      });

      return segment;
    },

    async finalize(
      id: string,

      input:
        FinalizeCallInput
    ) {
      const call =
        requireCall(id);

      if (
        call.status !==
        CallStatus.IN_PROGRESS
      ) {
        throw new CallFinalizeNotAllowedError(
          call.status
        );
      }

      return updateStoredCall({
        ...call,

        status:
          CallStatus.COMPLETED,

        summary:
          input.summary,

        sentiment:
          input.sentiment,

        endedAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),
      });
    },

    async deleteDraft(
      id: string
    ) {
      const call =
        requireCall(id);

      if (
        call.status !==
        CallStatus.DRAFT
      ) {
        throw new CallNotDeletableError(
          call.status
        );
      }

      calls.delete(id);
    },
  };
}

function createTestApp(
  calls: CallSessionService
) {
  return buildApp({
    serverOptions: {
      logger: false,
    },

    dependencies:
      createDependencies(),

    calls,
  });
}

test(
  'call lifecycle works from draft to completed',

  async (context) => {
    const app =
      createTestApp(
        createCallServiceStub()
      );

    context.after(
      async () => {
        await app.close();
      }
    );

    const createResponse =
      await app.inject({
        method: 'POST',

        url:
          '/api/v1/calls',

        payload: {
          destinationNumber:
            '+919999999999',

          promptText:
            'Confirm the appointment.',

          languageCode:
            'en-IN',
        },
      });

    assert.equal(
      createResponse.statusCode,
      201
    );

    const created =
      createResponse.json<
        CallSessionDto
      >();

    assert.equal(
      created.status,
      CallStatus.DRAFT
    );

    const queued =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/status`,

        payload: {
          status:
            CallStatus.QUEUED,
        },
      });

    assert.equal(
      queued.statusCode,
      200
    );

    const starting =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/status`,

        payload: {
          status:
            CallStatus.STARTING,
        },
      });

    assert.equal(
      starting.statusCode,
      200
    );

    const ringing =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/status`,

        payload: {
          status:
            CallStatus.RINGING,
        },
      });

    assert.equal(
      ringing.statusCode,
      200
    );

    const inProgress =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/status`,

        payload: {
          status:
            CallStatus.IN_PROGRESS,
        },
      });

    assert.equal(
      inProgress.statusCode,
      200
    );

    const transcript =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/transcript`,

        payload: {
          speaker:
            TranscriptSpeaker.AI_AGENT,

          content:
            'Hello, this is the appointment assistant.',

          confidence: 0.98,
          latencyMs: 120,
        },
      });

    assert.equal(
      transcript.statusCode,
      201
    );

    const finalize =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/finalize`,

        payload: {
          summary:
            'Appointment was confirmed.',

          sentiment:
            SentimentLabel.POSITIVE,
        },
      });

    assert.equal(
      finalize.statusCode,
      200
    );

    const completed =
      finalize.json<
        CallSessionDto
      >();

    assert.equal(
      completed.status,
      CallStatus.COMPLETED
    );

    assert.equal(
      completed
        .transcriptSegments
        .length,
      1
    );
  }
);

test(
  'draft calls can be updated and deleted',

  async (context) => {
    const app =
      createTestApp(
        createCallServiceStub()
      );

    context.after(
      async () => {
        await app.close();
      }
    );

    const created =
      (
        await app.inject({
          method: 'POST',

          url:
            '/api/v1/calls',

          payload: {
            destinationNumber:
              '+911111111111',

            promptText:
              'Original prompt.',
          },
        })
      ).json<CallSessionDto>();

    const updated =
      await app.inject({
        method: 'PATCH',

        url:
          `/api/v1/calls/${created.id}`,

        payload: {
          destinationNumber:
            '+922222222222',

          promptText:
            'Updated prompt.',
        },
      });

    assert.equal(
      updated.statusCode,
      200
    );

    assert.equal(
      updated
        .json<CallSessionDto>()
        .promptSnapshot,

      'Updated prompt.'
    );

    const deleted =
      await app.inject({
        method: 'DELETE',

        url:
          `/api/v1/calls/${created.id}`,
      });

    assert.equal(
      deleted.statusCode,
      200
    );
  }
);

test(
  'invalid call transitions return 409',

  async (context) => {
    const app =
      createTestApp(
        createCallServiceStub()
      );

    context.after(
      async () => {
        await app.close();
      }
    );

    const created =
      (
        await app.inject({
          method: 'POST',

          url:
            '/api/v1/calls',

          payload: {
            destinationNumber:
              '+933333333333',

            promptText:
              'Test prompt.',
          },
        })
      ).json<CallSessionDto>();

    const response =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/status`,

        payload: {
          status:
            CallStatus.COMPLETED,
        },
      });

    assert.equal(
      response.statusCode,
      409
    );
  }
);

test(
  'transcript cannot be added to a draft call',

  async (context) => {
    const app =
      createTestApp(
        createCallServiceStub()
      );

    context.after(
      async () => {
        await app.close();
      }
    );

    const created =
      (
        await app.inject({
          method: 'POST',

          url:
            '/api/v1/calls',

          payload: {
            destinationNumber:
              '+944444444444',

            promptText:
              'Test prompt.',
          },
        })
      ).json<CallSessionDto>();

    const response =
      await app.inject({
        method: 'POST',

        url:
          `/api/v1/calls/${created.id}/transcript`,

        payload: {
          speaker:
            TranscriptSpeaker.AI_AGENT,

          content:
            'Not allowed yet.',
        },
      });

    assert.equal(
      response.statusCode,
      409
    );
  }
);

test(
  'missing calls return 404',

  async (context) => {
    const app =
      createTestApp(
        createCallServiceStub()
      );

    context.after(
      async () => {
        await app.close();
      }
    );

    const response =
      await app.inject({
        method: 'GET',

        url:
          `/api/v1/calls/${randomUUID()}`,
      });

    assert.equal(
      response.statusCode,
      404
    );
  }
);