import 'dotenv/config';

import {
  buildApp,
} from './app.js';

import {
  loadEnvironment,
} from './config/environment.js';

import {
  createActiveCallStore,
} from './infrastructure/active-call-store.js';

import {
  createDependencyManager,
} from './infrastructure/dependency-manager.js';

import {
  createPrismaClient,
} from './infrastructure/prisma.js';

import {
  createTelephonyEventRepository,
} from './infrastructure/telephony-event-repository.js';

import {
  createTelephonySimulatorClient,
} from './infrastructure/telephony-simulator-client.js';

import {
  createCallOrchestrationService,
} from './modules/calls/call-orchestration-service.js';

import {
  createCallRecoveryService,
} from './modules/calls/call-recovery-service.js';

import {
  createCallSessionService,
} from './modules/calls/call-session-service.js';

import {
  createPromptTemplateService,
} from './modules/prompt-templates/prompt-template-service.js';

const environment =
  loadEnvironment();

const prisma =
  createPrismaClient({
    databaseUrl:
      environment.databaseUrl,
    timeoutMs:
      environment
        .dependencyTimeoutMs,
  });

const dependencies =
  createDependencyManager({
    prisma,
    redisUrl:
      environment.redisUrl,
    timeoutMs:
      environment
        .dependencyTimeoutMs,
    onRedisError(error) {
      console.error(
        'Redis client error:',
        error
      );
    },
  });

const activeCalls =
  createActiveCallStore({
    redisUrl:
      environment.redisUrl,
    timeoutMs:
      environment
        .dependencyTimeoutMs,
    ttlSeconds:
      environment
        .activeCallTtlSeconds,
    onError(error) {
      console.error(
        'Active-call Redis error:',
        error
      );
    },
  });

const telephonyEvents =
  createTelephonyEventRepository(
    prisma
  );

const promptTemplates =
  createPromptTemplateService(
    prisma
  );

const calls =
  createCallSessionService(
    prisma
  );

const telephony =
  createTelephonySimulatorClient({
    baseUrl:
      environment
        .telephonySimulatorUrl,
    internalToken:
      environment
        .telephonySimulatorToken,
    timeoutMs:
      environment
        .telephonyTimeoutMs,
  });

const orchestration =
  createCallOrchestrationService(
    calls,
    telephony,
    telephonyEvents,
    activeCalls
  );

const recovery =
  createCallRecoveryService(
    prisma,
    activeCalls
  );

const restoredCalls =
  await recovery.restore();

const app = buildApp({
  serverOptions: {
    logger: {
      level:
        environment.logLevel,
    },
  },
  dependencies,
  promptTemplates,
  calls,
  orchestration,
  internalApiToken:
    environment.internalApiToken,
  activeCalls,
  telephonyEvents,
  closeables: [
    activeCalls,
  ],
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
    'Graceful shutdown started'
  );

  try {
    await app.close();

    app.log.info(
      'Graceful shutdown completed'
    );
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
      environment:
        environment.nodeEnv,
      host: environment.host,
      port: environment.port,
      dependencyTimeoutMs:
        environment
          .dependencyTimeoutMs,
      telephonySimulatorUrl:
        environment
          .telephonySimulatorUrl,
      restoredCalls,
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

  try {
    await app.close();
  } catch (closeError) {
    app.log.error(
      {
        error: closeError,
      },
      'API cleanup failed'
    );
  }

  process.exitCode = 1;
}