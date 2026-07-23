import {
  CallStatus,
} from '../../generated/prisma/client.ts';

import type {
  VoiceNexusPrismaClient,
} from '../../infrastructure/prisma.js';

import type {
  ActiveCallStore,
} from '../../infrastructure/active-call-store.js';

export interface CallRecoveryService {
  restore(): Promise<number>;
}

export function createCallRecoveryService(
  prisma: VoiceNexusPrismaClient,
  activeCalls: ActiveCallStore
): CallRecoveryService {
  return {
    async restore():
    Promise<number> {
      const calls =
        await prisma.callSession
          .findMany({
            where: {
              status: {
                in: [
                  CallStatus.QUEUED,
                  CallStatus.STARTING,
                  CallStatus.RINGING,
                  CallStatus.IN_PROGRESS,
                ],
              },
            },
            select: {
              id: true,
              providerCallId: true,
              status: true,
              destinationNumber: true,
              provider: true,
              updatedAt: true,
            },
          });

      for (const call of calls) {
        await activeCalls.set({
          callSessionId: call.id,
          sessionId:
            call.providerCallId,
          status: call.status,
          destinationNumber:
            call.destinationNumber,
          provider:
            call.provider,
          updatedAt:
            call.updatedAt
              .toISOString(),
        });
      }

      return calls.length;
    },
  };
}