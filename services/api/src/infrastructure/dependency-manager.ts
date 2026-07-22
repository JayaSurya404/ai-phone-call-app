import { createClient } from 'redis';

import type {
  VoiceNexusPrismaClient,
} from './prisma.js';

export interface DependencyManager {
  checkPostgresql(): Promise<void>;
  checkRedis(): Promise<void>;
  close(): Promise<void>;
}

export interface DependencyManagerOptions {
  prisma: VoiceNexusPrismaClient;
  redisUrl: string;
  timeoutMs: number;
  onRedisError?: (error: Error) => void;
}

export function createDependencyManager(
  options: DependencyManagerOptions
): DependencyManager {
  const redisClient = createClient({
    url: options.redisUrl,

    socket: {
      connectTimeout: options.timeoutMs,
      reconnectStrategy: false,
    },
  });

  redisClient.on('error', (error) => {
    options.onRedisError?.(error);
  });

  let redisConnectionPromise:
    | Promise<void>
    | undefined;

  async function ensureRedisConnection():
  Promise<void> {
    if (redisClient.isReady) {
      return;
    }

    if (!redisConnectionPromise) {
      redisConnectionPromise = (async () => {
        if (!redisClient.isOpen) {
          await redisClient.connect();
        }

        if (!redisClient.isReady) {
          throw new Error(
            'Redis connection opened but is not ready.'
          );
        }
      })().finally(() => {
        redisConnectionPromise = undefined;
      });
    }

    await redisConnectionPromise;
  }

  return {
    async checkPostgresql(): Promise<void> {
      await options.prisma.$queryRaw`
        SELECT 1
      `;
    },

    async checkRedis(): Promise<void> {
      await ensureRedisConnection();

      const response =
        await redisClient.ping();

      if (response !== 'PONG') {
        throw new Error(
          `Unexpected Redis PING response: ${response}`
        );
      }
    },

    async close(): Promise<void> {
      await options.prisma.$disconnect();

      if (redisClient.isOpen) {
        try {
          await redisClient.quit();
        } catch {
          redisClient.destroy();
        }
      }
    },
  };
}