import type {
  CallRealtimeHub,
} from '../../infrastructure/call-realtime-hub.js';

import type {
  AiTurnResult,
  AiTurnService,
  ProcessAiTurnInput,
} from '../ai/ai-turn-service.js';

import type {
  CallSessionService,
} from '../calls/call-session-service.js';

import {
  createCallRealtimeEvent,
} from './event-factory.js';

export function createRealtimeAiTurnService(
  base:
    AiTurnService,

  calls:
    CallSessionService,

  hub:
    CallRealtimeHub
): AiTurnService {
  return {
    async process(
      callSessionId: string,

      input:
        ProcessAiTurnInput
    ): Promise<AiTurnResult> {
      const before =
        await calls.getById(
          callSessionId
        );

      const previousCount =
        before
          .transcriptSegments
          .length;

      const result =
        await base.process(
          callSessionId,
          input
        );

      const after =
        await calls.getById(
          callSessionId
        );

      const newSegments =
        after.transcriptSegments
          .slice(previousCount);

      for (
        const segment of
        newSegments
      ) {
        await hub.publish(
          createCallRealtimeEvent(
            callSessionId,

            'transcript.added',

            {
              segment,

              callStatus:
                after.status,
            }
          )
        );
      }

      await hub.publish(
        createCallRealtimeEvent(
          callSessionId,

          'ai.turn.completed',

          {
            remoteText:
              result.remoteText,

            assistantText:
              result.assistantText,

            assistantAudioMimeType:
              result
                .assistantAudioMimeType,

            assistantSampleRateHz:
              result
                .assistantSampleRateHz,

            providerNames:
              result.providerNames,

            metrics:
              result.metrics,
          }
        )
      );

      return result;
    },
  };
}