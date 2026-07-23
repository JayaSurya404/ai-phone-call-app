import type {
  TelephonyProviderEvent,
} from '../domain/contracts.js';

export interface ApiCallbackClient {
  send(
    event: TelephonyProviderEvent
  ): Promise<void>;
}

export interface ApiCallbackClientOptions {
  apiBaseUrl: string;
  internalToken: string;
  timeoutMs: number;
  maxAttempts: number;
}

export class ApiCallbackError
  extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiCallbackError';
  }
}

function wait(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

export function createApiCallbackClient(
  options: ApiCallbackClientOptions
): ApiCallbackClient {
  async function sendOnce(
    event: TelephonyProviderEvent
  ): Promise<void> {
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
        `${options.apiBaseUrl}/api/v1/internal/telephony/events`,
        {
          method: 'POST',
          headers: {
            authorization:
              `Bearer ${options.internalToken}`,
            'content-type':
              'application/json',
          },
          body:
            JSON.stringify(event),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const body =
          await response.text();

        throw new ApiCallbackError(
          response.status,
          body ||
            'The API rejected the simulator callback.'
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async send(
      event: TelephonyProviderEvent
    ): Promise<void> {
      let lastError: unknown;

      for (
        let attempt = 1;
        attempt <=
          options.maxAttempts;
        attempt += 1
      ) {
        try {
          await sendOnce(event);
          return;
        } catch (error) {
          lastError = error;

          if (
            error instanceof
              ApiCallbackError &&
            error.statusCode >= 400 &&
            error.statusCode < 500
          ) {
            throw error;
          }

          if (
            attempt <
            options.maxAttempts
          ) {
            await wait(
              200 * attempt
            );
          }
        }
      }

      throw (
        lastError instanceof Error
          ? lastError
          : new Error(
              'The API callback failed.'
            )
      );
    },
  };
}