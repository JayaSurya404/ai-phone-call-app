import assert from 'node:assert/strict';

import {
  randomUUID,
} from 'node:crypto';

import test from 'node:test';

import {
  CallStatus,
  SentimentLabel,
} from '../src/generated/prisma/client.ts';

import {
  createAiProviderRegistry,
} from '../src/modules/ai/provider-registry.js';

import {
  AiTurnStatusError,
  createAiTurnService,
} from '../src/modules/ai/ai-turn-service.js';

import type {
  CallSessionDto,
  CallSessionService,
} from '../src/modules/calls/call-session-service.js';

function createCall(
  status:
    CallStatus =
      CallStatus.IN_PROGRESS
): CallSessionDto {
  const now =
    new Date().toISOString();

  return {
    id: randomUUID(),

    destinationNumber:
      '+919999999999',

    promptSnapshot:
      'Confirm the appointment politely.',

    promptTemplateId:
      null,

    status,

    languageCode:
      'en-IN',

    provider:
      'telephony-simulator',

    providerCallId:
      'sim-session',

    startedAt:
      status ===
      CallStatus.IN_PROGRESS
        ? now
        : null,

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
  initialCall:
    CallSessionDto
): CallSessionService {
  let call = initialCall;

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
        status:
          input.status,
        startedAt:
          input.status ===
          CallStatus.IN_PROGRESS
            ? new Date()
                .toISOString()
            : call.startedAt,
        updatedAt:
          new Date()
            .toISOString(),
      };

      return call;
    },

    async addTranscriptSegment(
      _id,
      input
    ) {
      const segment = {
        id: randomUUID(),

        callSessionId:
          call.id,

        sequence:
          call
            .transcriptSegments
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
          new Date()
            .toISOString(),
      };

      call = {
        ...call,

        transcriptSegments: [
          ...call
            .transcriptSegments,
          segment,
        ],
      };

      return segment;
    },

    async finalize() {
      return call;
    },

    async deleteDraft() {
      return Promise.resolve();
    },
  };
}

function createRegistry() {
  return createAiProviderRegistry({
    mode: 'simulated',

    inferenceBaseUrl:
      'http://127.0.0.1:3200',

    inferenceInternalToken:
      'test-token',

    inferenceTimeoutMs:
      1000,

    speechToTextName:
      'faster-whisper',

    languageModelName:
      'qwen',

    textToSpeechName:
      'kokoro',
  });
}

void test(
  'AI turn stores both transcript sides and returns audio',

  async () => {
    const calls =
      createCallService(
        createCall()
      );

    const registry =
      createRegistry();

    const service =
      createAiTurnService(
        calls,
        registry
      );

    const result =
      await service.process(
        randomUUID(),
        {
          remoteText:
            'Yes, I confirm the appointment.',
        }
      );

    assert.equal(
      result.remoteText,
      'Yes, I confirm the appointment.'
    );

    assert.match(
      result.assistantText,
      /Thank you for confirming/
    );

    assert.equal(
      result
        .assistantAudioMimeType,
      'audio/wav'
    );

    assert.ok(
      result
        .assistantAudioBase64
        .length > 100
    );

    await registry.close();
  }
);

void test(
  'AI turn can transcribe simulated audio',

  async () => {
    const calls =
      createCallService(
        createCall()
      );

    const registry =
      createRegistry();

    const service =
      createAiTurnService(
        calls,
        registry
      );

    const result =
      await service.process(
        randomUUID(),
        {
          audioBase64:
            Buffer.from(
              'I need to reschedule.'
            ).toString(
              'base64'
            ),

          audioMimeType:
            'audio/wav',
        }
      );

    assert.equal(
      result.remoteText,
      'I need to reschedule.'
    );

    assert.match(
      result.assistantText,
      /reschedule/
    );

    await registry.close();
  }
);

void test(
  'AI turn rejects inactive calls',

  async () => {
    const calls =
      createCallService(
        createCall(
          CallStatus.DRAFT
        )
      );

    const registry =
      createRegistry();

    const service =
      createAiTurnService(
        calls,
        registry
      );

    await assert.rejects(
      service.process(
        randomUUID(),
        {
          remoteText:
            'Hello',
        }
      ),
      AiTurnStatusError
    );

    await registry.close();
  }
);