const supportedLogLevels = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

type LogLevel =
  (typeof supportedLogLevels)[number];

export interface Environment {
  nodeEnv:
    | 'development'
    | 'test'
    | 'production';
  host: string;
  port: number;
  logLevel: LogLevel;
  databaseUrl: string;
  redisUrl: string;
  dependencyTimeoutMs: number;
  internalApiToken: string;
  telephonyProviderMode:
    | 'simulator'
    | 'http';
  telephonySimulatorUrl: string;
  telephonySimulatorToken: string;
  telephonyHttpUrl: string;
  telephonyHttpToken: string;
  telephonyHttpProviderName: string;
  telephonyWebhookPublicUrl: string;
  telephonyWebhookSecret: string;
  telephonyWebhookMaxAgeSeconds: number;
  telephonyTimeoutMs: number;
  activeCallTtlSeconds: number;
  aiProviderMode:
    | 'simulated'
    | 'http';
  inferenceBaseUrl: string;
  inferenceInternalToken: string;
  inferenceTimeoutMs: number;
  speechToTextProviderName: string;
  languageModelProviderName: string;
  textToSpeechProviderName: string;
  realtimeClientToken: string;
  realtimeHeartbeatMs: number;
  realtimeChannelPrefix: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  bodyLimitBytes: number;
  trustProxy: boolean;
}

function requiredString(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback?: string
): string {
  const value =
    source[key]?.trim() ||
    fallback?.trim();

  if (!value) {
    throw new Error(
      `${key} is required.`
    );
  }

  return value;
}

function positiveInteger(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: number
): number {
  const value = Number(
    source[key]?.trim() ??
    String(fallback)
  );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${key} must be a positive integer.`
    );
  }

  return value;
}

function booleanValue(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean
): boolean {
  const value =
    source[key]?.trim()
      .toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(
    `${key} must be true or false.`
  );
}

function commaSeparated(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: string
): string[] {
  const values =
    requiredString(
      source,
      key,
      fallback
    )
      .split(',')
      .map(
        (value) =>
          value.trim()
      )
      .filter(Boolean);

  if (values.length === 0) {
    throw new Error(
      `${key} must contain at least one value.`
    );
  }

  return values;
}

function validatedUrl(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback:
    | string
    | undefined,
  protocols:
    readonly string[]
): string {
  const raw = requiredString(
    source,
    key,
    fallback
  );

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `${key} must be a valid URL.`
    );
  }

  if (
    !protocols.includes(
      url.protocol
    )
  ) {
    throw new Error(
      `${key} has an unsupported protocol.`
    );
  }

  return url.toString().replace(
    /\/$/,
    ''
  );
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv =
    process.env
): Environment {
  const nodeEnv =
    source.NODE_ENV?.trim() ||
    'development';

  if (
    nodeEnv !== 'development' &&
    nodeEnv !== 'test' &&
    nodeEnv !== 'production'
  ) {
    throw new Error(
      'NODE_ENV must be development, test, or production.'
    );
  }

  const logLevel =
    source.LOG_LEVEL?.trim() ||
    'info';

  if (
    !supportedLogLevels.includes(
      logLevel as LogLevel
    )
  ) {
    throw new Error(
      'LOG_LEVEL is unsupported.'
    );
  }

  const telephonyProviderMode =
    source.TELEPHONY_PROVIDER_MODE
      ?.trim() ||
    'simulator';

  if (
    telephonyProviderMode !==
      'simulator' &&
    telephonyProviderMode !==
      'http'
  ) {
    throw new Error(
      'TELEPHONY_PROVIDER_MODE must be simulator or http.'
    );
  }

  const aiProviderMode =
    source.AI_PROVIDER_MODE
      ?.trim() ||
    'simulated';

  if (
    aiProviderMode !==
      'simulated' &&
    aiProviderMode !==
      'http'
  ) {
    throw new Error(
      'AI_PROVIDER_MODE must be simulated or http.'
    );
  }

  return {
    nodeEnv,

    host:
      source.API_HOST?.trim() ||
      '0.0.0.0',

    port:
      positiveInteger(
        source,
        'API_PORT',
        3000
      ),

    logLevel:
      logLevel as LogLevel,

    databaseUrl:
      validatedUrl(
        source,
        'DATABASE_URL',
        undefined,
        [
          'postgresql:',
          'postgres:',
        ]
      ),

    redisUrl:
      validatedUrl(
        source,
        'REDIS_URL',
        undefined,
        [
          'redis:',
          'rediss:',
        ]
      ),

    dependencyTimeoutMs:
      positiveInteger(
        source,
        'DEPENDENCY_TIMEOUT_MS',
        2000
      ),

    internalApiToken:
      requiredString(
        source,
        'INTERNAL_API_TOKEN',
        'voicenexus_local_api_internal_token_2026'
      ),

    telephonyProviderMode,

    telephonySimulatorUrl:
      validatedUrl(
        source,
        'TELEPHONY_SIMULATOR_URL',
        'http://127.0.0.1:3100',
        [
          'http:',
          'https:',
        ]
      ),

    telephonySimulatorToken:
      requiredString(
        source,
        'TELEPHONY_SIMULATOR_TOKEN',
        'voicenexus_local_simulator_token_2026'
      ),

    telephonyHttpUrl:
      validatedUrl(
        source,
        'TELEPHONY_HTTP_URL',
        'http://127.0.0.1:3300',
        [
          'http:',
          'https:',
        ]
      ),

    telephonyHttpToken:
      requiredString(
        source,
        'TELEPHONY_HTTP_TOKEN',
        'voicenexus_local_http_telephony_token_2026'
      ),

    telephonyHttpProviderName:
      requiredString(
        source,
        'TELEPHONY_HTTP_PROVIDER_NAME',
        'generic-http-telephony'
      ),

    telephonyWebhookPublicUrl:
      validatedUrl(
        source,
        'TELEPHONY_WEBHOOK_PUBLIC_URL',
        'http://127.0.0.1:3000/api/v1/webhooks/telephony/events',
        [
          'http:',
          'https:',
        ]
      ),

    telephonyWebhookSecret:
      requiredString(
        source,
        'TELEPHONY_WEBHOOK_SECRET',
        'voicenexus_local_webhook_secret_2026'
      ),

    telephonyWebhookMaxAgeSeconds:
      positiveInteger(
        source,
        'TELEPHONY_WEBHOOK_MAX_AGE_SECONDS',
        300
      ),

    telephonyTimeoutMs:
      positiveInteger(
        source,
        'TELEPHONY_TIMEOUT_MS',
        5000
      ),

    activeCallTtlSeconds:
      positiveInteger(
        source,
        'ACTIVE_CALL_TTL_SECONDS',
        86400
      ),

    aiProviderMode,

    inferenceBaseUrl:
      validatedUrl(
        source,
        'INFERENCE_BASE_URL',
        'http://127.0.0.1:3200',
        [
          'http:',
          'https:',
        ]
      ),

    inferenceInternalToken:
      requiredString(
        source,
        'INFERENCE_INTERNAL_TOKEN',
        'voicenexus_local_inference_token_2026'
      ),

    inferenceTimeoutMs:
      positiveInteger(
        source,
        'INFERENCE_TIMEOUT_MS',
        15000
      ),

    speechToTextProviderName:
      requiredString(
        source,
        'STT_PROVIDER_NAME',
        'faster-whisper'
      ),

    languageModelProviderName:
      requiredString(
        source,
        'LLM_PROVIDER_NAME',
        'qwen'
      ),

    textToSpeechProviderName:
      requiredString(
        source,
        'TTS_PROVIDER_NAME',
        'kokoro'
      ),

    realtimeClientToken:
      requiredString(
        source,
        'REALTIME_CLIENT_TOKEN',
        'voicenexus_local_realtime_token_2026'
      ),

    realtimeHeartbeatMs:
      positiveInteger(
        source,
        'REALTIME_HEARTBEAT_MS',
        15000
      ),

    realtimeChannelPrefix:
      requiredString(
        source,
        'REALTIME_CHANNEL_PREFIX',
        'voicenexus:call-events'
      ),

    corsOrigins:
      commaSeparated(
        source,
        'CORS_ORIGINS',
        nodeEnv === 'production'
          ? 'https://example.invalid'
          : '*'
      ),

    rateLimitMax:
      positiveInteger(
        source,
        'RATE_LIMIT_MAX',
        300
      ),

    rateLimitWindowMs:
      positiveInteger(
        source,
        'RATE_LIMIT_WINDOW_MS',
        60000
      ),

    bodyLimitBytes:
      positiveInteger(
        source,
        'BODY_LIMIT_BYTES',
        1048576
      ),

    trustProxy:
      booleanValue(
        source,
        'TRUST_PROXY',
        false
      ),
  };
}