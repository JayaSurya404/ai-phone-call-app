export const simulatorScenarioIds = [
  'appointment-confirmed',
  'appointment-declined',
  'no-answer',
  'busy',
  'provider-failure',
] as const;

export type SimulatorScenarioId =
  (typeof simulatorScenarioIds)[number];

export interface StartSimulatorInput {
  callSessionId: string;
  destinationNumber: string;
  promptSnapshot: string;
  languageCode: string;
  scenarioId?: SimulatorScenarioId;
}

export interface StartedSimulatorSession {
  id: string;
  providerCallId: string;
}

export interface TelephonySimulatorClient {
  startSession(
    input: StartSimulatorInput
  ): Promise<StartedSimulatorSession>;

  cancelSession(
    sessionId: string
  ): Promise<void>;
}

export class TelephonySimulatorRequestError
  extends Error {
  readonly statusCode = 502;

  constructor(message: string) {
    super(message);

    this.name =
      'TelephonySimulatorRequestError';
  }
}

export interface TelephonySimulatorClientOptions {
  baseUrl: string;
  internalToken: string;
  timeoutMs: number;
}

export function createTelephonySimulatorClient(
  options:
    TelephonySimulatorClientOptions
): TelephonySimulatorClient {
  async function request(
    path: string,
    init: RequestInit
  ): Promise<Response> {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => {
        controller.abort();
      },
      options.timeoutMs
    );

    try {
      const response = await fetch(
        `${options.baseUrl}${path}`,
        {
          ...init,
          headers: {
            authorization:
              `Bearer ${options.internalToken}`,
            'content-type':
              'application/json',
            ...init.headers,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const body =
          await response.text();

        throw new TelephonySimulatorRequestError(
          body ||
            `Simulator request failed with HTTP ${response.status}.`
        );
      }

      return response;
    } catch (error) {
      if (
        error instanceof
        TelephonySimulatorRequestError
      ) {
        throw error;
      }

      throw new TelephonySimulatorRequestError(
        error instanceof Error
          ? error.message
          : 'The simulator request failed.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async startSession(
      input: StartSimulatorInput
    ): Promise<StartedSimulatorSession> {
      const response =
        await request(
          '/internal/v1/sessions',
          {
            method: 'POST',
            body:
              JSON.stringify(input),
          }
        );

      const result =
        await response.json() as {
          id: string;
          providerCallId: string;
        };

      return {
        id: result.id,
        providerCallId:
          result.providerCallId,
      };
    },

    async cancelSession(
      sessionId: string
    ): Promise<void> {
      await request(
        `/internal/v1/sessions/${sessionId}`,
        {
          method: 'DELETE',
        }
      );
    },
  };
}