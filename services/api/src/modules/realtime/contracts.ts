import type {
  CallSessionDto,
  TranscriptSegmentDto,
} from '../calls/call-session-service.js';

export const callRealtimeEventTypes = [
  'call.snapshot',
  'call.status',
  'transcript.added',
  'ai.turn.completed',
  'call.completed',
  'call.failed',
  'call.cancelled',
  'heartbeat',
] as const;

export type CallRealtimeEventType =
  (typeof callRealtimeEventTypes)[number];

export interface CallRealtimeEvent<
  TPayload = unknown
> {
  version: 1;
  eventId: string;
  callSessionId: string;
  type: CallRealtimeEventType;
  occurredAt: string;
  payload: TPayload;
}

export interface CallSnapshotPayload {
  call: CallSessionDto;
}

export interface CallStatusPayload {
  call: CallSessionDto;
  source:
    | 'api'
    | 'telephony'
    | 'recovery';
}

export interface TranscriptAddedPayload {
  segment:
    TranscriptSegmentDto;
  callStatus:
    CallSessionDto['status'];
}

export interface AiTurnCompletedPayload {
  remoteText: string;
  assistantText: string;
  assistantAudioMimeType:
    string;
  assistantSampleRateHz:
    number;
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

export interface HeartbeatPayload {
  serverTime: string;
}