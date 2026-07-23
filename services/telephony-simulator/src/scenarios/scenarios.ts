import type {
  SentimentLabel,
  SimulatorScenarioId,
  TranscriptSpeaker,
} from '../domain/contracts.js';

export type ScenarioStep =
  | {
      delayMs: number;
      type: 'ringing';
    }
  | {
      delayMs: number;
      type: 'connected';
    }
  | {
      delayMs: number;
      type: 'transcript';
      speaker: TranscriptSpeaker;
      content: string;
      confidence: number;
      sentiment: SentimentLabel;
      latencyMs: number;
      startedAtMs: number;
      endedAtMs: number;
    }
  | {
      delayMs: number;
      type: 'completed';
      summary: string;
      sentiment: SentimentLabel;
    }
  | {
      delayMs: number;
      type: 'failed';
      reason: string;
    };

export interface SimulatorScenario {
  id: SimulatorScenarioId;
  steps: readonly ScenarioStep[];
}

const appointmentConfirmed:
SimulatorScenario = {
  id: 'appointment-confirmed',
  steps: [
    {
      delayMs: 400,
      type: 'ringing',
    },
    {
      delayMs: 600,
      type: 'connected',
    },
    {
      delayMs: 500,
      type: 'transcript',
      speaker: 'AI_AGENT',
      content:
        'Hello, I am calling to confirm your upcoming appointment.',
      confidence: 0.99,
      sentiment: 'NEUTRAL',
      latencyMs: 110,
      startedAtMs: 0,
      endedAtMs: 2600,
    },
    {
      delayMs: 700,
      type: 'transcript',
      speaker: 'REMOTE_PARTY',
      content:
        'Yes, I confirm that I will attend the appointment.',
      confidence: 0.97,
      sentiment: 'POSITIVE',
      latencyMs: 135,
      startedAtMs: 2900,
      endedAtMs: 6100,
    },
    {
      delayMs: 500,
      type: 'completed',
      summary:
        'The customer confirmed the appointment.',
      sentiment: 'POSITIVE',
    },
  ],
};

const appointmentDeclined:
SimulatorScenario = {
  id: 'appointment-declined',
  steps: [
    {
      delayMs: 400,
      type: 'ringing',
    },
    {
      delayMs: 600,
      type: 'connected',
    },
    {
      delayMs: 500,
      type: 'transcript',
      speaker: 'AI_AGENT',
      content:
        'Hello, I am calling to confirm your upcoming appointment.',
      confidence: 0.99,
      sentiment: 'NEUTRAL',
      latencyMs: 112,
      startedAtMs: 0,
      endedAtMs: 2600,
    },
    {
      delayMs: 700,
      type: 'transcript',
      speaker: 'REMOTE_PARTY',
      content:
        'I cannot attend and need to reschedule.',
      confidence: 0.95,
      sentiment: 'NEGATIVE',
      latencyMs: 148,
      startedAtMs: 2900,
      endedAtMs: 5900,
    },
    {
      delayMs: 500,
      type: 'completed',
      summary:
        'The customer declined and requested rescheduling.',
      sentiment: 'NEGATIVE',
    },
  ],
};

const noAnswer:
SimulatorScenario = {
  id: 'no-answer',
  steps: [
    {
      delayMs: 400,
      type: 'ringing',
    },
    {
      delayMs: 1800,
      type: 'failed',
      reason:
        'The destination did not answer the simulated call.',
    },
  ],
};

const busy:
SimulatorScenario = {
  id: 'busy',
  steps: [
    {
      delayMs: 500,
      type: 'failed',
      reason:
        'The destination was busy.',
    },
  ],
};

const providerFailure:
SimulatorScenario = {
  id: 'provider-failure',
  steps: [
    {
      delayMs: 300,
      type: 'failed',
      reason:
        'The simulated telephony provider failed to establish the call.',
    },
  ],
};

const scenarioMap:
Record<
  SimulatorScenarioId,
  SimulatorScenario
> = {
  'appointment-confirmed':
    appointmentConfirmed,
  'appointment-declined':
    appointmentDeclined,
  'no-answer': noAnswer,
  busy,
  'provider-failure':
    providerFailure,
};

export function getScenario(
  scenarioId: SimulatorScenarioId
): SimulatorScenario {
  return scenarioMap[scenarioId];
}