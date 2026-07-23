import type {
  CallRealtimeHub,
} from '../../infrastructure/call-realtime-hub.js';

import type {
  CallOrchestrationService,
  ProviderEventProcessingResult,
  StartCallInput,
} from '../calls/call-orchestration-service.js';

import type {
  CallSessionDto,
  TranscriptSegmentDto,
} from '../calls/call-session-service.js';

import type {
  TelephonyProviderEventInput,
} from '../calls/provider-event-contracts.js';

import {
  createCallRealtimeEvent,
} from './event-factory.js';

function lastTranscript(
  call: CallSessionDto
): TranscriptSegmentDto | null {
  return (
    call.transcriptSegments.at(
      -1
    ) ??
    null
  );
}

async function publishStatus(
  hub: CallRealtimeHub,
  call: CallSessionDto,
  source:
    | 'api'
    | 'telephony'
): Promise<void> {
  await hub.publish(
    createCallRealtimeEvent(
      call.id,
      'call.status',
      {
        call,
        source,
      }
    )
  );
}

export function createRealtimeOrchestrationService(
  base:
    CallOrchestrationService,
  hub:
    CallRealtimeHub
): CallOrchestrationService {
  return {
    async start(
      id: string,
      input: StartCallInput
    ): Promise<CallSessionDto> {
      const call =
        await base.start(
          id,
          input
        );

      await publishStatus(
        hub,
        call,
        'api'
      );

      return call;
    },

    async cancel(
      id: string
    ): Promise<CallSessionDto> {
      const call =
        await base.cancel(id);

      await hub.publish(
        createCallRealtimeEvent(
          call.id,
          'call.cancelled',
          {
            call,
            source: 'api',
          }
        )
      );

      return call;
    },

    async handleProviderEvent(
      event:
        TelephonyProviderEventInput
    ): Promise<
      ProviderEventProcessingResult
    > {
      const result =
        await base
          .handleProviderEvent(
            event
          );

      if (result.duplicate) {
        return result;
      }

      switch (event.type) {
        case 'transcript': {
          const segment =
            lastTranscript(
              result.call
            );

          if (segment) {
            await hub.publish(
              createCallRealtimeEvent(
                result.call.id,

                'transcript.added',

                {
                  segment,

                  callStatus:
                    result.call
                      .status,
                }
              )
            );
          }

          break;
        }

        case 'completed':
          await hub.publish(
            createCallRealtimeEvent(
              result.call.id,

              'call.completed',

              {
                call:
                  result.call,

                source:
                  'telephony',
              }
            )
          );

          break;

        case 'failed':
          await hub.publish(
            createCallRealtimeEvent(
              result.call.id,

              'call.failed',

              {
                call:
                  result.call,

                source:
                  'telephony',
              }
            )
          );

          break;

        case 'cancelled':
          await hub.publish(
            createCallRealtimeEvent(
              result.call.id,

              'call.cancelled',

              {
                call:
                  result.call,

                source:
                  'telephony',
              }
            )
          );

          break;

        case 'ringing':
        case 'connected':
          await publishStatus(
            hub,
            result.call,
            'telephony'
          );

          break;
      }

      return result;
    },
  };
}