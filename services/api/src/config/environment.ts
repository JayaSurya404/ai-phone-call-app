const nodeEnvironmentValues = [
  'development',
  'test',
  'production',
] as const;

const logLevelValues = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

export type NodeEnvironment =
  (typeof nodeEnvironmentValues)[number];

export type LogLevel =
  (typeof logLevelValues)[number];

export interface Environment {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  logLevel: LogLevel;
  dependencyTimeoutMs: number;
  databaseUrl: string;
  redisUrl: string;
}

function parseChoice<const T extends readonly string[]>(
  name: string,
  value: string | undefined,
  allowedValues: T,
  defaultValue: T[number]
): T[number] {
  const resolvedValue = value?.trim() || defaultValue;

  if (!allowedValues.includes(resolvedValue)) {
    throw new Error(
      `${name} must be one of: ${allowedValues.join(', ')}. ` +
        `Received: ${resolvedValue}`
    );
  }

  return resolvedValue;
}

function parseInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number
): number {
  const resolvedValue =
    value?.trim() || String(defaultValue);

  const parsedValue = Number(resolvedValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `${name} must be an integer between ` +
        `${minimum} and ${maximum}. ` +
        `Received: ${resolvedValue}`
    );
  }

  return parsedValue;
}

function parseRequiredUrl(
  name: string,
  value: string | undefined,
  allowedProtocols: readonly string[]
): string {
  const resolvedValue = value?.trim();

  if (!resolvedValue) {
    throw new Error(`${name} is required.`);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(resolvedValue);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error(
      `${name} must use one of these protocols: ` +
        allowedProtocols.join(', ')
    );
  }

  return resolvedValue;
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env
): Environment {
  return {
    nodeEnv: parseChoice(
      'NODE_ENV',
      source.NODE_ENV,
      nodeEnvironmentValues,
      'development'
    ),

    host: source.API_HOST?.trim() || '0.0.0.0',

    port: parseInteger(
      'API_PORT',
      source.API_PORT,
      3000,
      1,
      65_535
    ),

    logLevel: parseChoice(
      'LOG_LEVEL',
      source.LOG_LEVEL,
      logLevelValues,
      'info'
    ),

    dependencyTimeoutMs: parseInteger(
      'DEPENDENCY_TIMEOUT_MS',
      source.DEPENDENCY_TIMEOUT_MS,
      2000,
      100,
      30_000
    ),

    databaseUrl: parseRequiredUrl(
      'DATABASE_URL',
      source.DATABASE_URL,
      ['postgresql:', 'postgres:']
    ),

    redisUrl: parseRequiredUrl(
      'REDIS_URL',
      source.REDIS_URL,
      ['redis:', 'rediss:']
    ),
  };
}