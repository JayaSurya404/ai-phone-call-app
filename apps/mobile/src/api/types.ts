export type CallStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'STARTING'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type SentimentLabel =
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'MIXED'
  | 'UNKNOWN';

export type TranscriptSpeaker =
  | 'AI_AGENT'
  | 'REMOTE_PARTY'
  | 'SYSTEM';

export interface TranscriptSegment {
  id: string;
  callSessionId: string;
  sequence: number;
  speaker: TranscriptSpeaker;
  content: string;
  confidence: number | null;
  sentiment: SentimentLabel;
  latencyMs: number | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
  createdAt: string;
}

export interface CallSession {
  id: string;
  destinationNumber: string;
  promptSnapshot: string;
  promptTemplateId: string | null;
  status: CallStatus;
  languageCode: string;
  provider: string | null;
  providerCallId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  sentiment: SentimentLabel;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  transcriptSegments:
    TranscriptSegment[];
}

export interface CallSessionListItem {
  id: string;
  destinationNumber: string;
  status: CallStatus;
  languageCode: string;
  provider: string | null;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  sentiment: SentimentLabel;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  promptText: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiListResponse<
  TItem
> {
  items: TItem[];
  count: number;
}

export type SimulatorScenarioId =
  | 'appointment-confirmed'
  | 'appointment-declined'
  | 'no-answer'
  | 'busy'
  | 'provider-failure';