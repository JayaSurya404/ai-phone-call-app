import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.ts';

export type VoiceNexusPrismaClient =
  PrismaClient;

export interface PrismaClientOptions {
  databaseUrl: string;
  timeoutMs: number;
}

export function createPrismaClient(
  options: PrismaClientOptions
): VoiceNexusPrismaClient {
  const adapter = new PrismaPg({
    connectionString: options.databaseUrl,
    max: 5,
    connectionTimeoutMillis:
      options.timeoutMs,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClient({
    adapter,
    log: [
      'warn',
      'error',
    ],
  });
}