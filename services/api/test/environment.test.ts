import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadEnvironment,
} from '../src/config/environment.js';

function validEnvironment():
NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: '3000',
    LOG_LEVEL: 'silent',
    DATABASE_URL:
      'postgresql://user:password@127.0.0.1:5433/database',
    REDIS_URL:
      'redis://:password@127.0.0.1:6380',
    DEPENDENCY_TIMEOUT_MS:
      '2000',
    INTERNAL_API_TOKEN:
      'test-api-token',
    TELEPHONY_SIMULATOR_URL:
      'http://127.0.0.1:3100',
    TELEPHONY_SIMULATOR_TOKEN:
      'test-simulator-token',
    TELEPHONY_TIMEOUT_MS:
      '3000',
    ACTIVE_CALL_TTL_SECONDS:
      '86400',
  };
}

test(
  'loadEnvironment parses valid values',
  () => {
    const environment =
      loadEnvironment(
        validEnvironment()
      );

    assert.equal(
      environment.nodeEnv,
      'test'
    );

    assert.equal(
      environment.port,
      3000
    );

    assert.equal(
      environment
        .activeCallTtlSeconds,
      86400
    );

    assert.equal(
      environment
        .telephonySimulatorUrl,
      'http://127.0.0.1:3100'
    );
  }
);

test(
  'loadEnvironment rejects a missing database URL',
  () => {
    const source =
      validEnvironment();

    delete source.DATABASE_URL;

    assert.throws(
      () => {
        loadEnvironment(source);
      },
      /DATABASE_URL is required/
    );
  }
);

test(
  'loadEnvironment rejects an invalid Redis URL',
  () => {
    const source =
      validEnvironment();

    source.REDIS_URL =
      'not-a-url';

    assert.throws(
      () => {
        loadEnvironment(source);
      },
      /REDIS_URL must be a valid URL/
    );
  }
);

test(
  'loadEnvironment rejects an invalid API port',
  () => {
    const source =
      validEnvironment();

    source.API_PORT = 'zero';

    assert.throws(
      () => {
        loadEnvironment(source);
      },
      /API_PORT must be a positive integer/
    );
  }
);

test(
  'loadEnvironment rejects an unsupported log level',
  () => {
    const source =
      validEnvironment();

    source.LOG_LEVEL =
      'verbose';

    assert.throws(
      () => {
        loadEnvironment(source);
      },
      /LOG_LEVEL is unsupported/
    );
  }
);