import type {
  LanguageModelProvider,
  LanguageModelRequest,
  LanguageModelResult,
  ProviderHealth,
  SpeechToTextProvider,
  SpeechToTextRequest,
  SpeechToTextResult,
  TextToSpeechProvider,
  TextToSpeechRequest,
  TextToSpeechResult,
} from './contracts.js';

export interface HttpAiProviderOptions {
  baseUrl: string;
  internalToken: string;
  timeoutMs: number;
  speechToTextName: string;
  languageModelName: string;
  textToSpeechName: string;
}

export class AiProviderRequestError
  extends Error {
  readonly statusCode = 502;

  constructor(message: string) {
    super(message);

    this.name =
      'AiProviderRequestError';
  }
}

function createHttpClient(
  options:
    HttpAiProviderOptions
) {
  async function requestJson<
    TResult
  >(
    path: string,
    body?: unknown
  ): Promise<TResult> {
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
          method:
            body === undefined
              ? 'GET'
              : 'POST',
          headers: {
            authorization:
              `Bearer ${options.internalToken}`,
            'content-type':
              'application/json',
          },
          ...(body === undefined
            ? {}
            : {
                body:
                  JSON.stringify(body),
              }),
          signal:
            controller.signal,
        }
      );

      if (!response.ok) {
        const responseBody =
          await response.text();

        throw new AiProviderRequestError(
          responseBody ||
          `Inference provider returned HTTP ${response.status}.`
        );
      }

      return await response
        .json() as TResult;
    } catch (error) {
      if (
        error instanceof
        AiProviderRequestError
      ) {
        throw error;
      }

      throw new AiProviderRequestError(
        error instanceof Error
          ? error.message
          : 'The inference provider request failed.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    requestJson,
  };
}

function createHealthCheck(
  client:
    ReturnType<
      typeof createHttpClient
    >,
  name: string
): () => Promise<ProviderHealth> {
  return async () => {
    try {
      await client.requestJson<{
        status: string;
      }>(
        '/internal/v1/health/ready'
      );

      return {
        name,
        ready: true,
        detail: null,
      };
    } catch (error) {
      return {
        name,
        ready: false,
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  };
}

export function createHttpSpeechToTextProvider(
  options:
    HttpAiProviderOptions
): SpeechToTextProvider {
  const client =
    createHttpClient(options);

  return {
    name:
      options.speechToTextName,

    async transcribe(
      request:
        SpeechToTextRequest
    ): Promise<SpeechToTextResult> {
      return client.requestJson(
        '/internal/v1/stt/transcribe',
        request
      );
    },

    health:
      createHealthCheck(
        client,
        options.speechToTextName
      ),

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createHttpLanguageModelProvider(
  options:
    HttpAiProviderOptions
): LanguageModelProvider {
  const client =
    createHttpClient(options);

  return {
    name:
      options.languageModelName,

    async generate(
      request:
        LanguageModelRequest
    ): Promise<LanguageModelResult> {
      return client.requestJson(
        '/internal/v1/llm/generate',
        request
      );
    },

    health:
      createHealthCheck(
        client,
        options.languageModelName
      ),

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createHttpTextToSpeechProvider(
  options:
    HttpAiProviderOptions
): TextToSpeechProvider {
  const client =
    createHttpClient(options);

  return {
    name:
      options.textToSpeechName,

    async synthesize(
      request:
        TextToSpeechRequest
    ): Promise<TextToSpeechResult> {
      return client.requestJson(
        '/internal/v1/tts/synthesize',
        request
      );
    },

    health:
      createHealthCheck(
        client,
        options.textToSpeechName
      ),

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}