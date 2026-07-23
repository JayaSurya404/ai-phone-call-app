import {
  mobileEnvironment,
} from '../config/environment';

export class ApiRequestError
  extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);

    this.name =
      'ApiRequestError';
  }
}

interface RequestOptions {
  method?:
    | 'GET'
    | 'POST'
    | 'PATCH'
    | 'DELETE';

  body?: unknown;

  signal?: AbortSignal;
}

function getErrorMessage(
  value: unknown
): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message ===
      'string'
  ) {
    return value.message;
  }

  return (
    'The request could not be completed.'
  );
}

export async function apiRequest<
  TResponse
>(
  path: string,
  options:
    RequestOptions = {}
): Promise<TResponse> {
  const response = await fetch(
    `${mobileEnvironment.apiBaseUrl}${path}`,

    {
      method:
        options.method ??
        'GET',

      headers: {
        accept:
          'application/json',

        'content-type':
          'application/json',
      },

      ...(options.body ===
      undefined
        ? {}
        : {
            body:
              JSON.stringify(
                options.body
              ),
          }),

      ...(options.signal
        ? {
            signal:
              options.signal,
          }
        : {}),
    }
  );

  const text =
    await response.text();

  let payload:
    unknown = null;

  if (text) {
    try {
      payload =
        JSON.parse(text) as
          unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,

      getErrorMessage(
        payload
      )
    );
  }

  return payload as TResponse;
}