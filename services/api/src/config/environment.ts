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

export type NodeEnvironment = (typeof nodeEnvironmentValues)[number];
export type LogLevel = (typeof logLevelValues)[number];

export interface Environment {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  logLevel: LogLevel;
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
      `${name} must be one of: ${allowedValues.join(', ')}. Received: ${resolvedValue}`
    );
  }

  return resolvedValue;
}

function parsePort(value: string | undefined): number {
  const resolvedValue = value?.trim() || '3000';
  const port = Number(resolvedValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `API_PORT must be an integer between 1 and 65535. Received: ${resolvedValue}`
    );
  }

  return port;
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
    port: parsePort(source.API_PORT),
    logLevel: parseChoice(
      'LOG_LEVEL',
      source.LOG_LEVEL,
      logLevelValues,
      'info'
    ),
  };
}