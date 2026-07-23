import {
  performance,
} from 'node:perf_hooks';

import {
  CallStatus,
  SentimentLabel,
  TranscriptSpeaker,
} from '../../generated/prisma/client.ts';

import type {
  AiProviderRegistry,
  LanguageModelMessage,
} from './contracts.js';

import type {
  CallSessionDto,
  CallSessionService,
} from '../calls/call-session-service.js';

export interface ProcessAiTurnInput {
  remoteText?: string;
  audioBase64?: string;
  audioMimeType?: string;
  languageCode?: string;
  voice?: string | null;
}

export interface AiTurnResult {
  callSessionId: string;
  remoteText: string;
  assistantText: string;
  assistantAudioBase64: string;
  assistantAudioMimeType: string;
  assistantSampleRateHz: number;
  model: string;
  providerNames: {
    speechToText: string;
    languageModel: string;
    textToSpeech: string;
  };
  metrics: {
    speechToTextLatencyMs:
      number | null;
    languageModelLatencyMs:
      number;
    textToSpeechLatencyMs:
      number;
    totalLatencyMs: number;
  };
}

export interface AiTurnService {
  process(
    callSessionId: string,
    input: ProcessAiTurnInput
  ): Promise<AiTurnResult>;
}

export class AiTurnInputError
  extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'AiTurnInputError';
  }
}

export class AiTurnStatusError
  extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `AI turns require a RINGING or IN_PROGRESS call. Current status: ${status}.`
    );

    this.name =
      'AiTurnStatusError';
  }
}

function elapsedMilliseconds(
  startedAt: number
): number {
  return Math.max(
    0,
    Math.round(
      performance.now() -
      startedAt
    )
  );
}

function toMessages(
  call: CallSessionDto
): LanguageModelMessage[] {
  return call.transcriptSegments
    .filter(
      (segment) =>
        segment.speaker !==
        TranscriptSpeaker.SYSTEM
    )
    .map((segment) => ({
      role:
        segment.speaker ===
        TranscriptSpeaker.AI_AGENT
          ? 'assistant' as const
          : 'user' as const,
      content:
        segment.content,
    }));
}

function requireRemoteText(
  value: string | undefined
): string {
  const text = value?.trim();

  if (!text) {
    throw new AiTurnInputError(
      'remoteText or audioBase64 is required.'
    );
  }

  return text;
}

export function createAiTurnService(
  calls: CallSessionService,
  providers:
    AiProviderRegistry
): AiTurnService {
  return {
    async process(
      callSessionId: string,
      input: ProcessAiTurnInput
    ): Promise<AiTurnResult> {
      const totalStartedAt =
        performance.now();

      let call =
        await calls.getById(
          callSessionId
        );

      if (
        call.status !==
          CallStatus.RINGING &&
        call.status !==
          CallStatus.IN_PROGRESS
      ) {
        throw new AiTurnStatusError(
          call.status
        );
      }

      if (
        call.status ===
        CallStatus.RINGING
      ) {
        call =
          await calls.changeStatus(
            call.id,
            {
              status:
                CallStatus.IN_PROGRESS,
            }
          );
      }

      const languageCode =
        input.languageCode
          ?.trim() ||
        call.languageCode;

      let remoteText:
        string;

      let speechToTextLatencyMs:
        number | null = null;

      if (
        input.remoteText
          ?.trim()
      ) {
        remoteText =
          requireRemoteText(
            input.remoteText
          );
      } else if (
        input.audioBase64
          ?.trim()
      ) {
        const transcription =
          await providers
            .speechToText
            .transcribe({
              audioBase64:
                input.audioBase64,
              mimeType:
                input.audioMimeType
                  ?.trim() ||
                'audio/wav',
              languageCode,
            });

        remoteText =
          requireRemoteText(
            transcription.text
          );

        speechToTextLatencyMs =
          transcription.latencyMs;
      } else {
        throw new AiTurnInputError(
          'remoteText or audioBase64 is required.'
        );
      }

      await calls
        .addTranscriptSegment(
          call.id,
          {
            speaker:
              TranscriptSpeaker
                .REMOTE_PARTY,
            content:
              remoteText,
            confidence:
              input.remoteText
                ? 1
                : null,
            sentiment:
              SentimentLabel.UNKNOWN,
            latencyMs:
              speechToTextLatencyMs,
          }
        );

      call =
        await calls.getById(
          call.id
        );

      const generated =
        await providers
          .languageModel
          .generate({
            systemPrompt:
              call.promptSnapshot,
            messages:
              toMessages(call),
            languageCode,
          });

      await calls
        .addTranscriptSegment(
          call.id,
          {
            speaker:
              TranscriptSpeaker
                .AI_AGENT,
            content:
              generated.text,
            confidence: 1,
            sentiment:
              SentimentLabel.NEUTRAL,
            latencyMs:
              generated.latencyMs,
          }
        );

      const synthesized =
        await providers
          .textToSpeech
          .synthesize({
            text:
              generated.text,
            languageCode,
            voice:
              input.voice ??
              null,
          });

      return {
        callSessionId:
          call.id,

        remoteText,

        assistantText:
          generated.text,

        assistantAudioBase64:
          synthesized.audioBase64,

        assistantAudioMimeType:
          synthesized.mimeType,

        assistantSampleRateHz:
          synthesized.sampleRateHz,

        model:
          generated.model,

        providerNames: {
          speechToText:
            providers
              .speechToText
              .name,

          languageModel:
            providers
              .languageModel
              .name,

          textToSpeech:
            providers
              .textToSpeech
              .name,
        },

        metrics: {
          speechToTextLatencyMs,

          languageModelLatencyMs:
            generated.latencyMs,

          textToSpeechLatencyMs:
            synthesized.latencyMs,

          totalLatencyMs:
            elapsedMilliseconds(
              totalStartedAt
            ),
        },
      };
    },
  };
}