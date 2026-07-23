import {
  randomUUID,
} from 'node:crypto';

import type {
  ApiCallbackClient,
} from '../infrastructure/api-callback-client.js';

import type {
  ProviderEventType,
  SimulatorScenarioId,
  SimulatorSessionDto,
  SimulatorSessionStatus,
  StartSimulatorSessionInput,
  TelephonyProviderEvent,
} from '../domain/contracts.js';

import {
  getScenario,
  type ScenarioStep,
} from '../scenarios/scenarios.js';

interface StoredSession {
  id: string;
  providerCallId: string;
  callSessionId: string;
  destinationNumber: string;
  promptSnapshot: string;
  languageCode: string;
  scenarioId: SimulatorScenarioId;
  status: SimulatorSessionStatus;
  lastEventType: ProviderEventType | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  controller: AbortController;
}

export interface SessionManager {
  start(
    input: StartSimulatorSessionInput
  ): Promise<SimulatorSessionDto>;

  getById(
    id: string
  ): SimulatorSessionDto | null;

  cancel(
    id: string
  ): Promise<SimulatorSessionDto>;

  close(): Promise<void>;
}

export class SimulatorSessionNotFoundError
  extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(
      `Simulator session ${id} was not found.`
    );

    this.name =
      'SimulatorSessionNotFoundError';
  }
}

export class SimulatorSessionConflictError
  extends Error {
  readonly statusCode = 409;

  constructor(status: SimulatorSessionStatus) {
    super(
      `The simulator session cannot be cancelled while its status is ${status}.`
    );

    this.name =
      'SimulatorSessionConflictError';
  }
}

function toDto(
  session: StoredSession
): SimulatorSessionDto {
  return {
    id: session.id,
    providerCallId:
      session.providerCallId,
    callSessionId:
      session.callSessionId,
    destinationNumber:
      session.destinationNumber,
    scenarioId:
      session.scenarioId,
    status: session.status,
    lastEventType:
      session.lastEventType,
    failureReason:
      session.failureReason,
    createdAt:
      session.createdAt.toISOString(),
    updatedAt:
      session.updatedAt.toISOString(),
  };
}

function createProviderEvent(
  session: StoredSession,
  step: ScenarioStep
): TelephonyProviderEvent {
  const base = {
    eventId: randomUUID(),
    sessionId: session.id,
    callSessionId:
      session.callSessionId,
    occurredAt:
      new Date().toISOString(),
  };

  switch (step.type) {
    case 'ringing':
      return {
        ...base,
        type: 'ringing',
      };

    case 'connected':
      return {
        ...base,
        type: 'connected',
      };

    case 'transcript':
      return {
        ...base,
        type: 'transcript',
        speaker: step.speaker,
        content: step.content,
        confidence:
          step.confidence,
        sentiment:
          step.sentiment,
        latencyMs:
          step.latencyMs,
        startedAtMs:
          step.startedAtMs,
        endedAtMs:
          step.endedAtMs,
      };

    case 'completed':
      return {
        ...base,
        type: 'completed',
        summary: step.summary,
        sentiment:
          step.sentiment,
      };

    case 'failed':
      return {
        ...base,
        type: 'failed',
        reason: step.reason,
      };
  }
}

function wait(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      if (signal.aborted) {
        reject(
          new DOMException(
            'The operation was aborted.',
            'AbortError'
          )
        );

        return;
      }

      const timeout = setTimeout(
        resolve,
        milliseconds
      );

      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);

          reject(
            new DOMException(
              'The operation was aborted.',
              'AbortError'
            )
          );
        },
        {
          once: true,
        }
      );
    }
  );
}

function isAbortError(
  error: unknown
): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  );
}

export function createSessionManager(
  callbackClient: ApiCallbackClient,
  speedMultiplier: number
): SessionManager {
  const sessions =
    new Map<string, StoredSession>();

  async function run(
    session: StoredSession
  ): Promise<void> {
    const scenario =
      getScenario(session.scenarioId);

    try {
      for (
        const step of scenario.steps
      ) {
        await wait(
          Math.max(
            1,
            Math.round(
              step.delayMs /
                speedMultiplier
            )
          ),
          session.controller.signal
        );

        const event =
          createProviderEvent(
            session,
            step
          );

        await callbackClient.send(event);

        session.lastEventType =
          event.type;

        session.updatedAt =
          new Date();

        if (
          event.type === 'completed'
        ) {
          session.status =
            'COMPLETED';
        }

        if (
          event.type === 'failed'
        ) {
          session.status =
            'FAILED';

          session.failureReason =
            event.reason;
        }
      }
    } catch (error) {
      if (
        isAbortError(error) ||
        session.status ===
          'CANCELLED'
      ) {
        return;
      }

      session.status = 'FAILED';

      session.failureReason =
        error instanceof Error
          ? error.message
          : 'The simulator scenario failed.';

      session.updatedAt =
        new Date();
    }
  }

  return {
    async start(
      input: StartSimulatorSessionInput
    ): Promise<SimulatorSessionDto> {
      const id = randomUUID();
      const now = new Date();

      const session:
      StoredSession = {
        id,
        providerCallId:
          `sim-${id}`,
        callSessionId:
          input.callSessionId,
        destinationNumber:
          input.destinationNumber,
        promptSnapshot:
          input.promptSnapshot,
        languageCode:
          input.languageCode,
        scenarioId:
          input.scenarioId ??
          'appointment-confirmed',
        status: 'RUNNING',
        lastEventType: null,
        failureReason: null,
        createdAt: now,
        updatedAt: now,
        controller:
          new AbortController(),
      };

      sessions.set(id, session);

      void run(session);

      return toDto(session);
    },

    getById(
      id: string
    ): SimulatorSessionDto | null {
      const session =
        sessions.get(id);

      return session
        ? toDto(session)
        : null;
    },

    async cancel(
      id: string
    ): Promise<SimulatorSessionDto> {
      const session =
        sessions.get(id);

      if (!session) {
        throw new SimulatorSessionNotFoundError(
          id
        );
      }

      if (
        session.status !== 'RUNNING'
      ) {
        throw new SimulatorSessionConflictError(
          session.status
        );
      }

      session.controller.abort();
      session.status = 'CANCELLED';
      session.lastEventType =
        'cancelled';
      session.updatedAt =
        new Date();

      await callbackClient.send({
        eventId: randomUUID(),
        sessionId: session.id,
        callSessionId:
          session.callSessionId,
        occurredAt:
          session.updatedAt.toISOString(),
        type: 'cancelled',
        reason:
          'The simulated call was cancelled.',
      });

      return toDto(session);
    },

    async close(): Promise<void> {
      for (
        const session of sessions.values()
      ) {
        if (
          session.status === 'RUNNING'
        ) {
          session.controller.abort();
          session.status =
            'CANCELLED';
          session.updatedAt =
            new Date();
        }
      }
    },
  };
}