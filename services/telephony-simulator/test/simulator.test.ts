import assert from 'node:assert/strict';

import {
  randomUUID,
} from 'node:crypto';

import test from 'node:test';

import {
  buildSimulatorApp,
} from '../src/app.js';

import type {
  SimulatorSessionDto,
  StartSimulatorSessionInput,
} from '../src/domain/contracts.js';

import {
  SimulatorSessionNotFoundError,
  type SessionManager,
} from '../src/services/session-manager.js';

function createSessionManagerStub():
SessionManager {
  const sessions =
    new Map<
      string,
      SimulatorSessionDto
    >();

  return {
    async start(
      input:
        StartSimulatorSessionInput
    ) {
      const now =
        new Date().toISOString();

      const session:
      SimulatorSessionDto = {
        id: randomUUID(),
        providerCallId:
          `sim-${randomUUID()}`,
        callSessionId:
          input.callSessionId,
        destinationNumber:
          input.destinationNumber,
        scenarioId:
          input.scenarioId ??
          'appointment-confirmed',
        status: 'RUNNING',
        lastEventType: null,
        failureReason: null,
        createdAt: now,
        updatedAt: now,
      };

      sessions.set(
        session.id,
        session
      );

      return session;
    },

    getById(id) {
      return sessions.get(id) ??
        null;
    },

    async cancel(id) {
      const session =
        sessions.get(id);

      if (!session) {
        throw new SimulatorSessionNotFoundError(
          id
        );
      }

      const cancelled = {
        ...session,
        status:
          'CANCELLED' as const,
        lastEventType:
          'cancelled' as const,
        updatedAt:
          new Date().toISOString(),
      };

      sessions.set(
        id,
        cancelled
      );

      return cancelled;
    },

    async close() {
      return Promise.resolve();
    },
  };
}

test(
  'simulator health is available',
  async (context) => {
    const app =
      buildSimulatorApp({
        serverOptions: {
          logger: false,
        },
        internalToken:
          'test-token',
        sessions:
          createSessionManagerStub(),
      });

    context.after(
      async () => {
        await app.close();
      }
    );

    const response =
      await app.inject({
        method: 'GET',
        url:
          '/internal/v1/health/live',
      });

    assert.equal(
      response.statusCode,
      200
    );
  }
);

test(
  'simulator sessions require authorization',
  async (context) => {
    const app =
      buildSimulatorApp({
        serverOptions: {
          logger: false,
        },
        internalToken:
          'test-token',
        sessions:
          createSessionManagerStub(),
      });

    context.after(
      async () => {
        await app.close();
      }
    );

    const response =
      await app.inject({
        method: 'POST',
        url:
          '/internal/v1/sessions',
        payload: {
          callSessionId:
            randomUUID(),
          destinationNumber:
            '+919999999999',
          promptSnapshot:
            'Confirm an appointment.',
          languageCode:
            'en-IN',
        },
      });

    assert.equal(
      response.statusCode,
      401
    );
  }
);

test(
  'authorized simulator session lifecycle works',
  async (context) => {
    const app =
      buildSimulatorApp({
        serverOptions: {
          logger: false,
        },
        internalToken:
          'test-token',
        sessions:
          createSessionManagerStub(),
      });

    context.after(
      async () => {
        await app.close();
      }
    );

    const response =
      await app.inject({
        method: 'POST',
        url:
          '/internal/v1/sessions',
        headers: {
          authorization:
            'Bearer test-token',
        },
        payload: {
          callSessionId:
            randomUUID(),
          destinationNumber:
            '+919999999999',
          promptSnapshot:
            'Confirm an appointment.',
          languageCode:
            'en-IN',
          scenarioId:
            'appointment-confirmed',
        },
      });

    assert.equal(
      response.statusCode,
      201
    );

    const session =
      response.json<
        SimulatorSessionDto
      >();

    const cancelResponse =
      await app.inject({
        method: 'DELETE',
        url:
          `/internal/v1/sessions/${session.id}`,
        headers: {
          authorization:
            'Bearer test-token',
        },
      });

    assert.equal(
      cancelResponse.statusCode,
      200
    );
  }
);