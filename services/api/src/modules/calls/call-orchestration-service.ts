import {
  CallStatus,
  SentimentLabel,
} from '../../generated/prisma/client.ts';

import type {
  TelephonySimulatorClient,
  SimulatorScenarioId,
} from '../../infrastructure/telephony-simulator-client.js';

import type {
  ActiveCallStore,
} from '../../infrastructure/active-call-store.js';

import type {
  TelephonyEventRepository,
} from '../../infrastructure/telephony-event-repository.js';

import type {
  CallSessionDto,
  CallSessionService,
} from './call-session-service.js';

import type {
  TelephonyProviderEventInput,
} from './provider-event-contracts.js';

export interface StartCallInput {
  scenarioId?: SimulatorScenarioId;
}

export interface ProviderEventProcessingResult {
  duplicate: boolean;
  call: CallSessionDto;
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
    event: TelephonyProviderEventInput
  ): Promise<ProviderEventProcessingResult>;
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
    TelephonySimulatorClient,
  events:
    TelephonyEventRepository,
  activeCalls:
    ActiveCallStore
): CallOrchestrationService {
  async function syncActiveState(
    call: CallSessionDto,
    sessionId?: string | null
  ): Promise<void> {
    if (isTerminal(call.status)) {
      await activeCalls.remove(
        call.id
      );

      return;
    }

    await activeCalls.set({
      callSessionId: call.id,
      sessionId:
        sessionId ??
        call.providerCallId,
      status: call.status,
      destinationNumber:
        call.destinationNumber,
      provider: call.provider,
      updatedAt: call.updatedAt,
    });
  }

  async function moveToInProgress(
    call: CallSessionDto
  ): Promise<CallSessionDto> {
    let current = call;

    if (
      current.status ===
      CallStatus.QUEUED
    ) {
      current =
        await calls.changeStatus(
          current.id,
          {
            status:
              CallStatus.STARTING,
          }
        );
    }

    if (
      current.status ===
        CallStatus.STARTING ||
      current.status ===
        CallStatus.RINGING
    ) {
      current =
        await calls.changeStatus(
          current.id,
          {
            status:
              CallStatus.IN_PROGRESS,
          }
        );
    }

    return current;
  }

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

      const queued =
        await calls.changeStatus(
          id,
          {
            status:
              CallStatus.QUEUED,
          }
        );

      await syncActiveState(
        queued,
        null
      );

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

        const starting =
          await calls.changeStatus(
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

        await syncActiveState(
          starting,
          session.id
        );

        return starting;
      } catch (error) {
        const failed =
          await calls.changeStatus(
            id,
            {
              status:
                CallStatus.FAILED,
              failureReason:
                error instanceof Error
                  ? error.message
                  : 'The simulator failed to start.',
            }
          );

        await syncActiveState(failed);

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
          // The local state still becomes
          // cancelled if the provider
          // already ended its session.
        }
      }

      const cancelled =
        await calls.changeStatus(
          id,
          {
            status:
              CallStatus.CANCELLED,
          }
        );

      await syncActiveState(
        cancelled
      );

      return cancelled;
    },

    async handleProviderEvent(
      event:
        TelephonyProviderEventInput
    ): Promise<ProviderEventProcessingResult> {
      const claim =
        await events.claim(event);

      if (claim.duplicate) {
        return {
          duplicate: true,
          call:
            await calls.getById(
              event.callSessionId
            ),
        };
      }

      try {
        let call =
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
          await events.markProcessed(
            claim.id
          );

          await syncActiveState(
            call
          );

          return {
            duplicate: false,
            call,
          };
        }

        switch (event.type) {
          case 'ringing':
            if (
              call.status ===
              CallStatus.QUEUED
            ) {
              call =
                await calls.changeStatus(
                  call.id,
                  {
                    status:
                      CallStatus.STARTING,
                  }
                );
            }

            if (
              call.status ===
              CallStatus.STARTING
            ) {
              call =
                await calls.changeStatus(
                  call.id,
                  {
                    status:
                      CallStatus.RINGING,
                  }
                );
            }

            break;

          case 'connected':
            call =
              await moveToInProgress(
                call
              );

            break;

          case 'transcript': {
            call =
              await moveToInProgress(
                call
              );

            const speaker =
              event.speaker;

            if (!speaker) {
              throw new ProviderEventValidationError(
                'speaker is required for transcript events.'
              );
            }

            await calls
              .addTranscriptSegment(
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

            call =
              await calls.getById(
                call.id
              );

            break;
          }

          case 'completed':
            call =
              await moveToInProgress(
                call
              );

            call =
              await calls.finalize(
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

            break;

          case 'failed':
            call =
              await calls.changeStatus(
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

            break;

          case 'cancelled':
            call =
              await calls.changeStatus(
                call.id,
                {
                  status:
                    CallStatus.CANCELLED,
                  failureReason:
                    event.reason
                      ?.trim() ||
                    null,
                }
              );

            break;
        }

        await events.markProcessed(
          claim.id
        );

        await syncActiveState(
          call,
          event.sessionId
        );

        return {
          duplicate: false,
          call,
        };
      } catch (error) {
        await events.markFailed(
          claim.id,
          error
        );

        throw error;
      }
    },
  };
}