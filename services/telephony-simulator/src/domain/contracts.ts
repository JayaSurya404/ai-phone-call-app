export const scenarioIds = [
  'appointment-confirmed',
  'appointment-declined',
  'no-answer',
  'busy',
  'provider-failure',
] as const;

export type SimulatorScenarioId =
  (typeof scenarioIds)[number];

export const transcriptSpeakers = [
  'AI_AGENT',
  'REMOTE_PARTY',
  'SYSTEM',
] as const;

export type TranscriptSpeaker =
  (typeof transcriptSpeakers)[number];

export const sentimentLabels = [
  'POSITIVE',
  'NEUTRAL',
  'NEGATIVE',
  'MIXED',
  'UNKNOWN',
] as const;

export type SentimentLabel =
  (typeof sentimentLabels)[number];

export type ProviderEventType =
  | 'ringing'
  | 'connected'
  | 'transcript'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface ProviderEventBase {
  eventId: string;
  sessionId: string;
  callSessionId: string;
  occurredAt: string;
  type: ProviderEventType;
}

export interface RingingProviderEvent
  extends ProviderEventBase {
  type: 'ringing';
}

export interface ConnectedProviderEvent
  extends ProviderEventBase {
  type: 'connected';
}

export interface TranscriptProviderEvent
  extends ProviderEventBase {
  type: 'transcript';
  speaker: TranscriptSpeaker;
  content: string;
  confidence: number | null;
  sentiment: SentimentLabel;
  latencyMs: number | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
}

export interface CompletedProviderEvent
  extends ProviderEventBase {
  type: 'completed';
  summary: string;
  sentiment: SentimentLabel;
}

export interface FailedProviderEvent
  extends ProviderEventBase {
  type: 'failed';
  reason: string;
}

export interface CancelledProviderEvent
  extends ProviderEventBase {
  type: 'cancelled';
  reason: string;
}

export type TelephonyProviderEvent =
  | RingingProviderEvent
  | ConnectedProviderEvent
  | TranscriptProviderEvent
  | CompletedProviderEvent
  | FailedProviderEvent
  | CancelledProviderEvent;

export interface StartSimulatorSessionInput {
  callSessionId: string;
  destinationNumber: string;
  promptSnapshot: string;
  languageCode: string;
  scenarioId?: SimulatorScenarioId;
}

export const simulatorSessionStatuses = [
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export type SimulatorSessionStatus =
  (typeof simulatorSessionStatuses)[number];

export interface SimulatorSessionDto {
  id: string;
  providerCallId: string;
  callSessionId: string;
  destinationNumber: string;
  scenarioId: SimulatorScenarioId;
  status: SimulatorSessionStatus;
  lastEventType: ProviderEventType | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}