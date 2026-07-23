import assert from 'node:assert/strict';

import {
  randomUUID,
} from 'node:crypto';

import test from 'node:test';

import {
  CallStatus,
  SentimentLabel,
} from '../src/generated/prisma/client.ts';

import type {
  ActiveCallState,
  ActiveCallStore,
} from '../src/infrastructure/active-call-store.js';

import type {
  TelephonyEventDto,
  TelephonyEventRepository,
} from '../src/infrastructure/telephony-event-repository.js';

import type {
  TelephonySimulatorClient,
} from '../src/infrastructure/telephony-simulator-client.js';

import {
  createCallOrchestrationService,
} from '../src/modules/calls/call-orchestration-service.js';

import type {
  CallSessionDto,
  CallSessionService,
} from '../src/modules/calls/call-session-service.js';

function createCall():
CallSessionDto {
  const now =
    new Date().toISOString();

  return {
    id: randomUUID(),
    destinationNumber:
      '+919999999999',
    promptSnapshot:
      'Confirm the appointment.',
    promptTemplateId: null,
    status: CallStatus.DRAFT,
    languageCode: 'en-IN',
    provider: null,
    providerCallId: null,
    startedAt: null,
    endedAt: null,
    summary: null,
    sentiment:
      SentimentLabel.UNKNOWN,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    transcriptSegments: [],
  };
}

function createCallService(
  initial: CallSessionDto
): CallSessionService {
  let call = initial;

  return {
    async list() {
      return [];
    },

    async getById() {
      return call;
    },

    async create() {
      return call;
    },

    async updateDraft() {
      return call;
    },

    async changeStatus(
      _id,
      input
    ) {
      call = {
        ...call,
        status: input.status,
        provider:
          input.provider !==
          undefined
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
          input.status ===
            CallStatus.FAILED ||
          input.status ===
            CallStatus.CANCELLED
            ? new Date().toISOString()
            : call.endedAt,
        updatedAt:
          new Date().toISOString(),
      };

      return call;
    },

    async addTranscriptSegment(
      _id,
      input
    ) {
      const segment = {
        id: randomUUID(),
        callSessionId: call.id,
        sequence:
          call.transcriptSegments
            .length + 1,
        speaker: input.speaker,
        content: input.content,
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

      call = {
        ...call,
        transcriptSegments: [
          ...call.transcriptSegments,
          segment,
        ],
      };

      return segment;
    },

    async finalize(
      _id,
      input
    ) {
      call = {
        ...call,
        status:
          CallStatus.COMPLETED,
        summary: input.summary,
        sentiment:
          input.sentiment,
        endedAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString(),
      };

      return call;
    },

    async deleteDraft() {
      return Promise.resolve();
    },
  };
}

function createActiveStore():
ActiveCallStore {
  const values =
    new Map<
      string,
      ActiveCallState
    >();

  return {
    async set(state) {
      values.set(
        state.callSessionId,
        state
      );
    },

    async get(id) {
      return values.get(id) ??
        null;
    },

    async remove(id) {
      values.delete(id);
    },

    async ping() {
      return Promise.resolve();
    },

    async close() {
      return Promise.resolve();
    },
  };
}

function createEventRepository():
TelephonyEventRepository {
  const claimed =
    new Set<string>();

  return {
    async claim(event) {
      const duplicate =
        claimed.has(
          event.eventId
        );

      claimed.add(
        event.eventId
      );

      return {
        duplicate,
        id: event.eventId,
      };
    },

    async markProcessed() {
      return Promise.resolve();
    },

    async markFailed() {
      return Promise.resolve();
    },

    async listByCall():
    Promise<TelephonyEventDto[]> {
      return [];
    },
  };
}

function createTelephony():
TelephonySimulatorClient {
  return {
    async startSession() {
      return {
        id: 'sim-session',
        providerCallId:
          'sim-session',
      };
    },

    async cancelSession() {
      return Promise.resolve();
    },
  };
}

test(
  'provider event processing is idempotent',
  async () => {
    const call = createCall();
    const calls =
      createCallService(call);

    const orchestration =
      createCallOrchestrationService(
        calls,
        createTelephony(),
        createEventRepository(),
        createActiveStore()
      );

    await orchestration.start(
      call.id,
      {
        scenarioId:
          'appointment-confirmed',
      }
    );

    const event = {
      eventId: randomUUID(),
      sessionId: 'sim-session',
      callSessionId: call.id,
      occurredAt:
        new Date().toISOString(),
      type:
        'ringing' as const,
    };

    const first =
      await orchestration
        .handleProviderEvent(event);

    const duplicate =
      await orchestration
        .handleProviderEvent(event);

    assert.equal(
      first.duplicate,
      false
    );

    assert.equal(
      duplicate.duplicate,
      true
    );

    assert.equal(
      duplicate.call.status,
      CallStatus.RINGING
    );
  }
);