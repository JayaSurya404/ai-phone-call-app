import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';

test('GET /api/v1/health/live returns API liveness', async (context) => {
  const app = buildApp({
    logger: false,
  });

  context.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/health/live',
  });

  assert.equal(response.statusCode, 200);

  const payload = response.json<{
    status: string;
    service: string;
    timestamp: string;
    uptimeSeconds: number;
  }>();

  assert.equal(payload.status, 'ok');
  assert.equal(payload.service, 'voicenexus-api');
  assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(payload.uptimeSeconds >= 0);
});

test('GET /api/v1/health/ready returns API readiness', async (context) => {
  const app = buildApp({
    logger: false,
  });

  context.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/health/ready',
  });

  assert.equal(response.statusCode, 200);

  assert.deepEqual(response.json(), {
    status: 'ready',
    service: 'voicenexus-api',
    timestamp: response.json<{ timestamp: string }>().timestamp,
    checks: {
      api: 'ready',
    },
  });
});

test('unknown routes return the API 404 response', async (context) => {
  const app = buildApp({
    logger: false,
  });

  context.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/not-a-real-route',
  });

  assert.equal(response.statusCode, 404);

  assert.deepEqual(response.json(), {
    statusCode: 404,
    error: 'Not Found',
    message: 'Route GET /api/v1/not-a-real-route was not found.',
  });
});