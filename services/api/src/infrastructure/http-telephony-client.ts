import type {
  StartSimulatorInput,
  StartedSimulatorSession,
  TelephonySimulatorClient,
} from './telephony-simulator-client.js';

export interface HttpTelephonyClientOptions {
  baseUrl: string;
  bearerToken: string;
  timeoutMs: number;
  providerName: string;
  callbackUrl: string;
  callbackSecret: string;
}

export class HttpTelephonyRequestError
  extends Error {
  readonly statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name =
      'HttpTelephonyRequestError';
  }
}

function nonEmpty(
  value: unknown
): string | null {
  return (
    typeof value === 'string' &&
    value.trim() !== ''
  )
    ? value.trim()
    : null;
}

export function createHttpTelephonyClient(
  options:
    HttpTelephonyClientOptions
): TelephonySimulatorClient {
  async function request(
    path: string,
    init: RequestInit
  ): Promise<Response> {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        options.timeoutMs
      );

    try {
      const response =
        await fetch(
          `${options.baseUrl}${path}`,
          {
            ...init,

            headers: {
              authorization:
                `Bearer ${options.bearerToken}`,

              'content-type':
                'application/json',

              ...init.headers,
            },

            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        const body =
          await response.text();

        throw new HttpTelephonyRequestError(
          body ||
          `Telephony gateway returned HTTP ${response.status}.`
        );
      }

      return response;
    } catch (error) {
      if (
        error instanceof
        HttpTelephonyRequestError
      ) {
        throw error;
      }

      throw new HttpTelephonyRequestError(
        error instanceof Error
          ? error.message
          : 'The telephony gateway request failed.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    providerName:
      options.providerName,

    async startSession(
      input:
        StartSimulatorInput
    ): Promise<
      StartedSimulatorSession
    > {
      const response =
        await request(
          '/v1/calls',
          {
            method: 'POST',

            body:
              JSON.stringify({
                callSessionId:
                  input.callSessionId,

                destinationNumber:
                  input
                    .destinationNumber,

                promptSnapshot:
                  input.promptSnapshot,

                languageCode:
                  input.languageCode,

                ...(input.scenarioId
                  ? {
                      scenarioId:
                        input
                          .scenarioId,
                    }
                  : {}),

                callback: {
                  url:
                    options
                      .callbackUrl,

                  signingSecret:
                    options
                      .callbackSecret,
                },
              }),
          }
        );

      const result =
        await response.json() as {
          id?: unknown;
          providerCallId?: unknown;
        };

      const id =
        nonEmpty(result.id) ??
        nonEmpty(
          result.providerCallId
        );

      if (!id) {
        throw new HttpTelephonyRequestError(
          'The telephony gateway response did not include a call ID.'
        );
      }

      return {
        id,
        providerCallId: id,
      };
    },

    async cancelSession(
      sessionId: string
    ): Promise<void> {
      await request(
        `/v1/calls/${encodeURIComponent(
          sessionId
        )}`,

        {
          method: 'DELETE',
        }
      );
    },
  };
}