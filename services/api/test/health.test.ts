import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import type { DependencyManager } from '../src/infrastructure/dependency-manager.js';

function createDependencies(
  options: {
    postgresqlAvailable?: boolean;
    redisAvailable?: boolean;
  } = {}
): DependencyManager {
  return {
    async checkPostgresql() {
      if (
        options.postgresqlAvailable === false
      ) {
        throw new Error(
          'PostgreSQL unavailable'
        );
      }
    },

    async checkRedis() {
      if (options.redisAvailable === false) {
        throw new Error('Redis unavailable');
      }
    },

    async close() {
      return Promise.resolve();
    },
  };
}

test(
  'GET /api/v1/health/live returns API liveness',
  async (context) => {
    const app = buildApp({
      serverOptions: {
        logger: false,
      },
      dependencies: createDependencies(),
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
    assert.equal(
      payload.service,
      'voicenexus-api'
    );

    assert.match(
      payload.timestamp,
      /^\d{4}-\d{2}-\d{2}T/
    );

    assert.ok(payload.uptimeSeconds >= 0);
  }
);

test(
  'readiness returns 200 when dependencies are ready',
  async (context) => {
    const app = buildApp({
      serverOptions: {
        logger: false,
      },
      dependencies: createDependencies(),
    });

    context.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    assert.equal(response.statusCode, 200);

    const payload = response.json<{
      status: string;
      checks: {
        api: string;
        postgresql: string;
        redis: string;
      };
    }>();

    assert.equal(payload.status, 'ready');

    assert.deepEqual(payload.checks, {
      api: 'ready',
      postgresql: 'ready',
      redis: 'ready',
    });
  }
);

test(
  'readiness returns 503 when PostgreSQL is unavailable',
  async (context) => {
    const app = buildApp({
      serverOptions: {
        logger: false,
      },

      dependencies: createDependencies({
        postgresqlAvailable: false,
      }),
    });

    context.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    assert.equal(response.statusCode, 503);

    const payload = response.json<{
      status: string;
      checks: {
        postgresql: string;
        redis: string;
      };
    }>();

    assert.equal(
      payload.status,
      'not_ready'
    );

    assert.equal(
      payload.checks.postgresql,
      'unavailable'
    );

    assert.equal(
      payload.checks.redis,
      'ready'
    );
  }
);

test(
  'readiness returns 503 when Redis is unavailable',
  async (context) => {
    const app = buildApp({
      serverOptions: {
        logger: false,
      },

      dependencies: createDependencies({
        redisAvailable: false,
      }),
    });

    context.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    assert.equal(response.statusCode, 503);

    const payload = response.json<{
      checks: {
        postgresql: string;
        redis: string;
      };
    }>();

    assert.equal(
      payload.checks.postgresql,
      'ready'
    );

    assert.equal(
      payload.checks.redis,
      'unavailable'
    );
  }
);

test(
  'unknown routes return the API 404 response',
  async (context) => {
    const app = buildApp({
      serverOptions: {
        logger: false,
      },
      dependencies: createDependencies(),
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
      message:
        'Route GET /api/v1/not-a-real-route was not found.',
    });
  }
);