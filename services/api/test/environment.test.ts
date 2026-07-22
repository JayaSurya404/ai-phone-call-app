import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnvironment } from '../src/config/environment.js';

const validEnvironment = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: '3100',
  LOG_LEVEL: 'silent',
  DEPENDENCY_TIMEOUT_MS: '1500',
  DATABASE_URL:
    'postgresql://user:password@127.0.0.1:5433/database',
  REDIS_URL:
    'redis://:password@127.0.0.1:6380',
};

test(
  'loadEnvironment parses valid values',
  () => {
    const environment =
      loadEnvironment(validEnvironment);

    assert.deepEqual(environment, {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 3100,
      logLevel: 'silent',
      dependencyTimeoutMs: 1500,
      databaseUrl:
        validEnvironment.DATABASE_URL,
      redisUrl:
        validEnvironment.REDIS_URL,
    });
  }
);

test(
  'loadEnvironment rejects a missing database URL',
  () => {
    assert.throws(
      () =>
        loadEnvironment({
          ...validEnvironment,
          DATABASE_URL: '',
        }),
      /DATABASE_URL is required/
    );
  }
);

test(
  'loadEnvironment rejects an invalid Redis URL',
  () => {
    assert.throws(
      () =>
        loadEnvironment({
          ...validEnvironment,
          REDIS_URL: 'http://127.0.0.1',
        }),
      /REDIS_URL must use one of these protocols/
    );
  }
);

test(
  'loadEnvironment rejects an invalid API port',
  () => {
    assert.throws(
      () =>
        loadEnvironment({
          ...validEnvironment,
          API_PORT: '70000',
        }),
      /API_PORT must be an integer between 1 and 65535/
    );
  }
);

test(
  'loadEnvironment rejects an unsupported log level',
  () => {
    assert.throws(
      () =>
        loadEnvironment({
          ...validEnvironment,
          LOG_LEVEL: 'everything',
        }),
      /LOG_LEVEL must be one of/
    );
  }
);