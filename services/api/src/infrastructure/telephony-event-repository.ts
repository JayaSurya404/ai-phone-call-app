import {
  TelephonyEventType,
} from '../generated/prisma/client.ts';

import type {
  Prisma,
} from '../generated/prisma/client.ts';

import type {
  VoiceNexusPrismaClient,
} from './prisma.js';

import type {
  ProviderEventType,
  TelephonyProviderEventInput,
} from '../modules/calls/provider-event-contracts.js';

export interface TelephonyEventDto {
  id: string;
  providerEventId: string;
  sessionId: string;
  callSessionId: string;
  type: TelephonyEventType;
  occurredAt: string;
  payload: unknown;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
}

export interface ClaimedTelephonyEvent {
  duplicate: boolean;
  id: string;
}

export interface TelephonyEventRepository {
  claim(
    event: TelephonyProviderEventInput
  ): Promise<ClaimedTelephonyEvent>;

  markProcessed(
    id: string
  ): Promise<void>;

  markFailed(
    id: string,
    error: unknown
  ): Promise<void>;

  listByCall(
    callSessionId: string
  ): Promise<TelephonyEventDto[]>;
}

const eventTypeMap: Record<
  ProviderEventType,
  TelephonyEventType
> = {
  ringing:
    TelephonyEventType.RINGING,
  connected:
    TelephonyEventType.CONNECTED,
  transcript:
    TelephonyEventType.TRANSCRIPT,
  completed:
    TelephonyEventType.COMPLETED,
  failed:
    TelephonyEventType.FAILED,
  cancelled:
    TelephonyEventType.CANCELLED,
};

function getPrismaErrorCode(
  error: unknown
): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return undefined;
}

function errorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createTelephonyEventRepository(
  prisma: VoiceNexusPrismaClient
): TelephonyEventRepository {
  return {
    async claim(
      event: TelephonyProviderEventInput
    ): Promise<ClaimedTelephonyEvent> {
      try {
        const record =
          await prisma.telephonyEvent
            .create({
              data: {
                providerEventId:
                  event.eventId,
                sessionId:
                  event.sessionId,
                callSessionId:
                  event.callSessionId,
                type:
                  eventTypeMap[
                    event.type
                  ],
                occurredAt:
                  new Date(
                    event.occurredAt
                  ),
                payload:
                  event as unknown as
                    Prisma.InputJsonValue,
              },
              select: {
                id: true,
              },
            });

        return {
          duplicate: false,
          id: record.id,
        };
      } catch (error) {
        if (
          getPrismaErrorCode(error) !==
          'P2002'
        ) {
          throw error;
        }

        const existing =
          await prisma.telephonyEvent
            .findUniqueOrThrow({
              where: {
                providerEventId:
                  event.eventId,
              },
              select: {
                id: true,
              },
            });

        return {
          duplicate: true,
          id: existing.id,
        };
      }
    },

    async markProcessed(
      id: string
    ): Promise<void> {
      await prisma.telephonyEvent
        .update({
          where: {
            id,
          },
          data: {
            processedAt:
              new Date(),
            processingError: null,
          },
        });
    },

    async markFailed(
      id: string,
      error: unknown
    ): Promise<void> {
      await prisma.telephonyEvent
        .update({
          where: {
            id,
          },
          data: {
            processingError:
              errorMessage(error),
          },
        });
    },

    async listByCall(
      callSessionId: string
    ): Promise<TelephonyEventDto[]> {
      const records =
        await prisma.telephonyEvent
          .findMany({
            where: {
              callSessionId,
            },
            orderBy: [
              {
                occurredAt: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
          });

      return records.map(
        (record) => ({
          id: record.id,
          providerEventId:
            record.providerEventId,
          sessionId:
            record.sessionId,
          callSessionId:
            record.callSessionId,
          type: record.type,
          occurredAt:
            record.occurredAt
              .toISOString(),
          payload: record.payload,
          processedAt:
            record.processedAt
              ?.toISOString() ??
            null,
          processingError:
            record.processingError,
          createdAt:
            record.createdAt
              .toISOString(),
        })
      );
    },
  };
}