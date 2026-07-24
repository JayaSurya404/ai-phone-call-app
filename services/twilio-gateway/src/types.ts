export interface ProviderCallback {
  url: string;
  signingSecret: string;
}

export interface StartCallInput {
  callSessionId: string;
  destinationNumber: string;
  promptSnapshot: string;
  languageCode: string;
  callback: ProviderCallback;
}

export type TranscriptSpeaker =
  | 'AI_AGENT'
  | 'REMOTE_PARTY'
  | 'SYSTEM';

export type ProviderEventType =
  | 'ringing'
  | 'connected'
  | 'transcript'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProviderEvent {
  eventId: string;
  sessionId: string;
  callSessionId: string;
  occurredAt: string;
  type: ProviderEventType;
  speaker?: TranscriptSpeaker;
  content?: string;
  confidence?: number;
  sentiment?:
    | 'UNKNOWN'
    | 'NEUTRAL'
    | 'POSITIVE'
    | 'NEGATIVE'
    | 'MIXED';
  latencyMs?: number;
  startedAtMs?: number;
  endedAtMs?: number;
  summary?: string;
  reason?: string;
}

export type ProviderEventValues =
  Omit<
    ProviderEvent,
    | 'eventId'
    | 'sessionId'
    | 'callSessionId'
    | 'occurredAt'
    | 'type'
  >;

export interface ConversationMessage {
  role:
    | 'user'
    | 'model';
  text: string;
}

export interface ActiveGatewayCall {
  callSessionId: string;
  providerCallId: string;
  destinationNumber: string;
  promptSnapshot: string;
  languageProfileId: string;
  openingGreeting: string;
  callback: ProviderCallback;
  history: ConversationMessage[];
  transcript: Array<{
    speaker:
      | 'AI_AGENT'
      | 'REMOTE_PARTY';
    content: string;
  }>;
  createdAt: string;
  connectedSent: boolean;
  openingReported: boolean;
  completedSent: boolean;
  lastCallerText?: string;
  lastCallerAtMs?: number;
  timeout?: ReturnType<
    typeof setTimeout
  >;
}