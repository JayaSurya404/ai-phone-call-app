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

export interface SimulatorEnvironment {
  nodeEnv:
    | 'development'
    | 'test'
    | 'production';
  host: string;
  port: number;
  logLevel: LogLevel;
  internalToken: string;
  apiBaseUrl: string;
  apiInternalToken: string;
  callbackTimeoutMs: number;
  callbackMaxAttempts: number;
  scenarioSpeedMultiplier: number;
}

function readRequired(
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

function readPositiveInteger(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: number
): number {
  const raw =
    source[key]?.trim() ??
    String(fallback);

  const value = Number(raw);

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

function readPositiveNumber(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: number
): number {
  const raw =
    source[key]?.trim() ??
    String(fallback);

  const value = Number(raw);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${key} must be a positive number.`
    );
  }

  return value;
}

function readHttpUrl(
  source: NodeJS.ProcessEnv,
  key: string,
  fallback: string
): string {
  const raw = readRequired(
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
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    throw new Error(
      `${key} must use HTTP or HTTPS.`
    );
  }

  return url.toString().replace(
    /\/$/,
    ''
  );
}

export function loadSimulatorEnvironment(
  source: NodeJS.ProcessEnv =
    process.env
): SimulatorEnvironment {
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
      source.SIMULATOR_HOST?.trim() ||
      '0.0.0.0',
    port: readPositiveInteger(
      source,
      'SIMULATOR_PORT',
      3100
    ),
    logLevel: logLevel as LogLevel,
    internalToken: readRequired(
      source,
      'SIMULATOR_INTERNAL_TOKEN',
      'voicenexus_local_simulator_token_2026'
    ),
    apiBaseUrl: readHttpUrl(
      source,
      'API_BASE_URL',
      'http://127.0.0.1:3000'
    ),
    apiInternalToken: readRequired(
      source,
      'API_INTERNAL_TOKEN',
      'voicenexus_local_api_internal_token_2026'
    ),
    callbackTimeoutMs:
      readPositiveInteger(
        source,
        'CALLBACK_TIMEOUT_MS',
        3000
      ),
    callbackMaxAttempts:
      readPositiveInteger(
        source,
        'CALLBACK_MAX_ATTEMPTS',
        3
      ),
    scenarioSpeedMultiplier:
      readPositiveNumber(
        source,
        'SCENARIO_SPEED_MULTIPLIER',
        1
      ),
  };
}