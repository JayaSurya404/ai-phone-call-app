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
  telephonySimulatorUrl: string;
  telephonySimulatorToken: string;
  telephonyTimeoutMs: number;
  activeCallTtlSeconds: number;
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

function validatedUrl(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback:
    | string
    | undefined,
  protocols: readonly string[]
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

  return {
    nodeEnv,
    host:
      source.API_HOST?.trim() ||
      '0.0.0.0',
    port: positiveInteger(
      source,
      'API_PORT',
      3000
    ),
    logLevel: logLevel as LogLevel,
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
    telephonyTimeoutMs:
      positiveInteger(
        source,
        'TELEPHONY_TIMEOUT_MS',
        3000
      ),
    activeCallTtlSeconds:
      positiveInteger(
        source,
        'ACTIVE_CALL_TTL_SECONDS',
        86400
      ),
  };
}