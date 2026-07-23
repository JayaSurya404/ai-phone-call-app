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
  buildApp,
} from '../src/app.js';

import type {
  CallRealtimeHub,
  CallRealtimeListener,
} from '../src/infrastructure/call-realtime-hub.js';

import type {
  DependencyManager,
} from '../src/infrastructure/dependency-manager.js';

import type {
  CallRealtimeEvent,
} from '../src/modules/realtime/contracts.js';

import {
  createCallRealtimeEvent,
} from '../src/modules/realtime/event-factory.js';

import type {
  CallSessionDto,
  CallSessionService,
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

    status:
      CallStatus.IN_PROGRESS,

    languageCode:
      'en-IN',

    provider:
      'telephony-simulator',

    providerCallId:
      'sim-session',

    startedAt: now,
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

function createCalls(
  call: CallSessionDto
): CallSessionService {
  return {
    async list() {
      return [];
    },

    async getById(id) {
      assert.equal(
        id,
        call.id
      );

      return call;
    },

    async create() {
      return call;
    },

    async updateDraft() {
      return call;
    },

    async changeStatus() {
      return call;
    },

    async addTranscriptSegment() {
      throw new Error(
        'Not used by realtime tests.'
      );
    },

    async finalize() {
      return call;
    },

    async deleteDraft() {
      return Promise.resolve();
    },
  };
}

function createHub():
CallRealtimeHub {
  const listeners =
    new Map<
      string,
      Set<CallRealtimeListener>
    >();

  return {
    async publish(
      event:
        CallRealtimeEvent
    ) {
      for (
        const listener of
        listeners.get(
          event.callSessionId
        ) ?? []
      ) {
        listener(event);
      }
    },

    async subscribe(
      callSessionId,
      listener
    ) {
      let current =
        listeners.get(
          callSessionId
        );

      if (!current) {
        current =
          new Set<
            CallRealtimeListener
          >();

        listeners.set(
          callSessionId,
          current
        );
      }

      current.add(listener);

      return async () => {
        current?.delete(
          listener
        );
      };
    },

    async health() {
      return {
        ready: true,
        detail: null,
      };
    },

    async close() {
      listeners.clear();
    },
  };
}

function nextEvent(
  socket: {
    once(
      event: 'message',
      listener: (
        data: Buffer
      ) => void
    ): unknown;
  },

  predicate: (
    event:
      CallRealtimeEvent
  ) => boolean
): Promise<CallRealtimeEvent> {
  return new Promise(
    (resolve) => {
      const listen = (
        data: Buffer
      ) => {
        const event =
          JSON.parse(
            data.toString(
              'utf8'
            )
          ) as CallRealtimeEvent;

        if (predicate(event)) {
          resolve(event);
          return;
        }

        socket.once(
          'message',
          listen
        );
      };

      socket.once(
        'message',
        listen
      );
    }
  );
}

void test(
  'realtime websocket sends snapshots and live events',

  async (context) => {
    const call =
      createCall();

    const hub =
      createHub();

    const app =
      buildApp({
        serverOptions: {
          logger: false,
        },

        dependencies:
          createDependencies(),

        calls:
          createCalls(call),

        realtimeHub:
          hub,

        realtimeClientToken:
          'test-token',

        realtimeHeartbeatMs:
          60_000,

        closeables: [
          hub,
        ],
      });

    context.after(
      async () => {
        await app.close();
      }
    );

    await app.ready();

    const socket =
      await app.injectWS(
        `/api/v1/realtime/calls/${call.id}?token=test-token`
      );

    context.after(() => {
      socket.terminate();
    });

    const snapshotPromise =
      nextEvent(
        socket,
        (event) =>
          event.type ===
          'call.snapshot'
      );

    socket.send(
      JSON.stringify({
        type: 'resync',
      })
    );

    const snapshot =
      await snapshotPromise;

    assert.equal(
      snapshot.callSessionId,
      call.id
    );

    const statusPromise =
      nextEvent(
        socket,
        (event) =>
          event.type ===
          'call.status'
      );

    await hub.publish(
      createCallRealtimeEvent(
        call.id,

        'call.status',

        {
          call,
          source:
            'telephony',
        }
      )
    );

    const status =
      await statusPromise;

    assert.equal(
      status.type,
      'call.status'
    );
  }
);