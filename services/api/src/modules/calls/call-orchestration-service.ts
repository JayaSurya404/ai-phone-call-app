import {
  CallStatus,
  SentimentLabel,
} from '../../generated/prisma/client.ts';

import type {
  TranscriptSpeaker,
} from '../../generated/prisma/client.ts';

import type {
  TelephonySimulatorClient,
  SimulatorScenarioId,
} from '../../infrastructure/telephony-simulator-client.js';

import type {
  CallSessionDto,
  CallSessionService,
} from './call-session-service.js';

export const providerEventTypes = [
  'ringing',
  'connected',
  'transcript',
  'completed',
  'failed',
  'cancelled',
] as const;

export type ProviderEventType =
  (typeof providerEventTypes)[number];

export interface TelephonyProviderEventInput {
  eventId: string;
  sessionId: string;
  callSessionId: string;
  occurredAt: string;
  type: ProviderEventType;
  speaker?: TranscriptSpeaker;
  content?: string;
  confidence?: number | null;
  sentiment?: SentimentLabel;
  latencyMs?: number | null;
  startedAtMs?: number | null;
  endedAtMs?: number | null;
  summary?: string;
  reason?: string;
}

export interface StartCallInput {
  scenarioId?: SimulatorScenarioId;
}

export interface CallOrchestrationService {
  start(
    id: string,
    input: StartCallInput
  ): Promise<CallSessionDto>;

  cancel(
    id: string
  ): Promise<CallSessionDto>;

  handleProviderEvent(
    event:
      TelephonyProviderEventInput
  ): Promise<CallSessionDto>;
}

export class CallStartNotAllowedError
  extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `Only a DRAFT call can be started. Current status: ${status}.`
    );

    this.name =
      'CallStartNotAllowedError';
  }
}

export class CallCancelNotAllowedError
  extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `The call cannot be cancelled while its status is ${status}.`
    );

    this.name =
      'CallCancelNotAllowedError';
  }
}

export class ProviderEventValidationError
  extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);

    this.name =
      'ProviderEventValidationError';
  }
}

export class ProviderSessionMismatchError
  extends Error {
  readonly statusCode = 409;

  constructor() {
    super(
      'The provider event session does not match the call session.'
    );

    this.name =
      'ProviderSessionMismatchError';
  }
}

function requireString(
  value: string | undefined,
  field: string
): string {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new ProviderEventValidationError(
      `${field} is required for this provider event.`
    );
  }

  return normalized;
}

function isTerminal(
  status: CallStatus
): boolean {
  return (
    status ===
      CallStatus.COMPLETED ||
    status ===
      CallStatus.FAILED ||
    status ===
      CallStatus.CANCELLED
  );
}

export function createCallOrchestrationService(
  calls: CallSessionService,
  telephony:
    TelephonySimulatorClient
): CallOrchestrationService {
  return {
    async start(
      id: string,
      input: StartCallInput
    ): Promise<CallSessionDto> {
      const call =
        await calls.getById(id);

      if (
        call.status !==
        CallStatus.DRAFT
      ) {
        throw new CallStartNotAllowedError(
          call.status
        );
      }

      await calls.changeStatus(id, {
        status: CallStatus.QUEUED,
      });

      try {
        const session =
          await telephony.startSession({
            callSessionId: call.id,
            destinationNumber:
              call.destinationNumber,
            promptSnapshot:
              call.promptSnapshot,
            languageCode:
              call.languageCode,
            ...(input.scenarioId
              ? {
                  scenarioId:
                    input.scenarioId,
                }
              : {}),
          });

        return calls.changeStatus(
          id,
          {
            status:
              CallStatus.STARTING,
            provider:
              'telephony-simulator',
            providerCallId:
              session.id,
          }
        );
      } catch (error) {
        await calls.changeStatus(id, {
          status: CallStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message
              : 'The simulator failed to start.',
        });

        throw error;
      }
    },

    async cancel(
      id: string
    ): Promise<CallSessionDto> {
      const call =
        await calls.getById(id);

      if (isTerminal(call.status)) {
        throw new CallCancelNotAllowedError(
          call.status
        );
      }

      if (call.providerCallId) {
        try {
          await telephony.cancelSession(
            call.providerCallId
          );
        } catch {
          // The API still records the local
          // cancellation if the simulator
          // session already stopped.
        }
      }

      return calls.changeStatus(id, {
        status:
          CallStatus.CANCELLED,
      });
    },

    async handleProviderEvent(
      event:
        TelephonyProviderEventInput
    ): Promise<CallSessionDto> {
      const call =
        await calls.getById(
          event.callSessionId
        );

      if (
        call.providerCallId &&
        call.providerCallId !==
          event.sessionId
      ) {
        throw new ProviderSessionMismatchError();
      }

      if (isTerminal(call.status)) {
        return call;
      }

      switch (event.type) {
        case 'ringing':
          if (
            call.status ===
              CallStatus.STARTING
          ) {
            return calls.changeStatus(
              call.id,
              {
                status:
                  CallStatus.RINGING,
              }
            );
          }

          return call;

        case 'connected':
          if (
            call.status ===
              CallStatus.STARTING ||
            call.status ===
              CallStatus.RINGING
          ) {
            return calls.changeStatus(
              call.id,
              {
                status:
                  CallStatus.IN_PROGRESS,
              }
            );
          }

          return call;

        case 'transcript': {
          const speaker =
            event.speaker;

          if (!speaker) {
            throw new ProviderEventValidationError(
              'speaker is required for transcript events.'
            );
          }

          await calls.addTranscriptSegment(
            call.id,
            {
              speaker,
              content:
                requireString(
                  event.content,
                  'content'
                ),
              confidence:
                event.confidence ??
                null,
              sentiment:
                event.sentiment ??
                SentimentLabel.UNKNOWN,
              latencyMs:
                event.latencyMs ??
                null,
              startedAtMs:
                event.startedAtMs ??
                null,
              endedAtMs:
                event.endedAtMs ??
                null,
            }
          );

          return calls.getById(
            call.id
          );
        }

        case 'completed':
          return calls.finalize(
            call.id,
            {
              summary:
                requireString(
                  event.summary,
                  'summary'
                ),
              sentiment:
                event.sentiment ??
                SentimentLabel.NEUTRAL,
            }
          );

        case 'failed':
          return calls.changeStatus(
            call.id,
            {
              status:
                CallStatus.FAILED,
              failureReason:
                requireString(
                  event.reason,
                  'reason'
                ),
            }
          );

        case 'cancelled':
          return calls.changeStatus(
            call.id,
            {
              status:
                CallStatus.CANCELLED,
              failureReason:
                event.reason?.trim() ||
                null,
            }
          );
      }
    },
  };
}