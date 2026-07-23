import 'dotenv/config';

import {
  buildSimulatorApp,
} from './app.js';

import {
  loadSimulatorEnvironment,
} from './config/environment.js';

import {
  createApiCallbackClient,
} from './infrastructure/api-callback-client.js';

import {
  createSessionManager,
} from './services/session-manager.js';

const environment =
  loadSimulatorEnvironment();

const callbackClient =
  createApiCallbackClient({
    apiBaseUrl:
      environment.apiBaseUrl,
    internalToken:
      environment.apiInternalToken,
    timeoutMs:
      environment.callbackTimeoutMs,
    maxAttempts:
      environment.callbackMaxAttempts,
  });

const sessions =
  createSessionManager(
    callbackClient,
    environment
      .scenarioSpeedMultiplier
  );

const app = buildSimulatorApp({
  serverOptions: {
    logger: {
      level:
        environment.logLevel,
    },
  },
  internalToken:
    environment.internalToken,
  sessions,
});

let shutdownStarted = false;

async function shutdown(
  signal: NodeJS.Signals
): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  app.log.info(
    {
      signal,
    },
    'Simulator shutdown started'
  );

  try {
    await app.close();
  } catch (error) {
    app.log.error(
      {
        error,
      },
      'Simulator shutdown failed'
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
      environment:
        environment.nodeEnv,
      host: environment.host,
      port: environment.port,
      callbackMaxAttempts:
        environment
          .callbackMaxAttempts,
    },
    'VoiceNexus telephony simulator started'
  );
} catch (error) {
  app.log.fatal(
    {
      error,
    },
    'Telephony simulator failed to start'
  );

  try {
    await app.close();
  } catch {
    // Startup is already failing.
  }

  process.exitCode = 1;
}