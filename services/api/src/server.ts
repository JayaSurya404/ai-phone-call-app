import 'dotenv/config';

import { buildApp } from './app.js';
import { loadEnvironment } from './config/environment.js';

const environment = loadEnvironment();

const app = buildApp({
  logger: {
    level: environment.logLevel,
  },
});

let shutdownStarted = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  app.log.info(
    {
      signal,
    },
    'Graceful shutdown started'
  );

  try {
    await app.close();
    app.log.info('Graceful shutdown completed');
  } catch (error) {
    app.log.error(
      {
        error,
      },
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
    },
    'VoiceNexus API started'
  );
} catch (error) {
  app.log.fatal(
    {
      error,
    },
    'VoiceNexus API failed to start'
  );

  process.exitCode = 1;
}