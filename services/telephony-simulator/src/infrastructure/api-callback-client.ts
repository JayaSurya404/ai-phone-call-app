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

export function createApiCallbackClient(
  options: ApiCallbackClientOptions
): ApiCallbackClient {
  return {
    async send(
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
            body: JSON.stringify(event),
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
    },
  };
}