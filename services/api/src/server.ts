import 'dotenv/config';

import type { FastifyInstance } from 'fastify';

import { buildApp } from './app.js';
import { loadEnvironment } from './config/environment.js';
import { createDependencyManager } from './infrastructure/dependency-manager.js';

const environment = loadEnvironment();

let appForDependencyLogging:
  | FastifyInstance
  | undefined;

const dependencies = createDependencyManager({
  databaseUrl: environment.databaseUrl,
  redisUrl: environment.redisUrl,
  timeoutMs: environment.dependencyTimeoutMs,

  onRedisError(error) {
    if (appForDependencyLogging) {
      appForDependencyLogging.log.error(
        { error },
        'Redis client error'
      );
    } else {
      console.error('Redis client error:', error);
    }
  },
});

const app = buildApp({
  serverOptions: {
    logger: {
      level: environment.logLevel,
    },
  },
  dependencies,
});

appForDependencyLogging = app;

let shutdownStarted = false;

async function shutdown(
  signal: NodeJS.Signals
): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  app.log.info(
    { signal },
    'Graceful shutdown started'
  );

  try {
    await app.close();

    app.log.info(
      'Graceful shutdown completed'
    );
  } catch (error) {
    app.log.error(
      { error },
      'Graceful shutdown failed'
    );

    process.exitCode = 1;
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({
    host: environment.host,
    port: environment.port,
  });

  app.log.info(
    {
      environment: environment.nodeEnv,
      host: environment.host,
      port: environment.port,
      dependencyTimeoutMs:
        environment.dependencyTimeoutMs,
    },
    'VoiceNexus API started'
  );
} catch (error) {
  app.log.fatal(
    { error },
    'VoiceNexus API failed to start'
  );

  process.exitCode = 1;
}