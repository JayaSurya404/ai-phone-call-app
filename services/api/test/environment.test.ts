import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnvironment } from '../src/config/environment.js';

test('loadEnvironment returns safe development defaults', () => {
  const environment = loadEnvironment({});

  assert.deepEqual(environment, {
    nodeEnv: 'development',
    host: '0.0.0.0',
    port: 3000,
    logLevel: 'info',
  });
});

test('loadEnvironment parses valid custom values', () => {
  const environment = loadEnvironment({
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: '3100',
    LOG_LEVEL: 'silent',
  });

  assert.deepEqual(environment, {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 3100,
    logLevel: 'silent',
  });
});

test('loadEnvironment rejects an invalid API port', () => {
  assert.throws(
    () =>
      loadEnvironment({
        API_PORT: '70000',
      }),
    /API_PORT must be an integer between 1 and 65535/
  );
});

test('loadEnvironment rejects an unsupported log level', () => {
  assert.throws(
    () =>
      loadEnvironment({
        LOG_LEVEL: 'everything',
      }),
    /LOG_LEVEL must be one of/
  );
});