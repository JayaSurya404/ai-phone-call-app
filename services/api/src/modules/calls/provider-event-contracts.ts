import type {
  SentimentLabel,
  TranscriptSpeaker,
} from '../../generated/prisma/client.ts';

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