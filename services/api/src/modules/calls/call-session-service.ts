import {
  CallStatus,
  SentimentLabel,
  TranscriptSpeaker,
} from '../../generated/prisma/client.ts';

import type {
  VoiceNexusPrismaClient,
} from '../../infrastructure/prisma.js';

export interface TranscriptSegmentDto {
  id: string;
  callSessionId: string;
  sequence: number;
  speaker: TranscriptSpeaker;
  content: string;
  confidence: number | null;
  sentiment: SentimentLabel;
  latencyMs: number | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
  createdAt: string;
}

export interface CallSessionDto {
  id: string;
  destinationNumber: string;
  promptSnapshot: string;
  promptTemplateId: string | null;
  status: CallStatus;
  languageCode: string;
  provider: string | null;
  providerCallId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  sentiment: SentimentLabel;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  transcriptSegments: TranscriptSegmentDto[];
}

export interface CallSessionListItemDto {
  id: string;
  destinationNumber: string;
  status: CallStatus;
  languageCode: string;
  provider: string | null;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  sentiment: SentimentLabel;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallSessionInput {
  destinationNumber: string;
  promptTemplateId?: string | null;
  promptText?: string;
  languageCode?: string;
}

export interface UpdateDraftCallInput {
  destinationNumber?: string;
  promptTemplateId?: string | null;
  promptText?: string;
  languageCode?: string;
}

export interface ChangeCallStatusInput {
  status: CallStatus;
  provider?: string | null;
  providerCallId?: string | null;
  failureReason?: string | null;
}

export interface AddTranscriptSegmentInput {
  speaker: TranscriptSpeaker;
  content: string;
  confidence?: number | null;
  sentiment?: SentimentLabel;
  latencyMs?: number | null;
  startedAtMs?: number | null;
  endedAtMs?: number | null;
}

export interface FinalizeCallInput {
  summary: string;
  sentiment: SentimentLabel;
}

export interface CallSessionService {
  list(limit: number): Promise<CallSessionListItemDto[]>;

  getById(id: string): Promise<CallSessionDto>;

  create(
    input: CreateCallSessionInput
  ): Promise<CallSessionDto>;

  updateDraft(
    id: string,
    input: UpdateDraftCallInput
  ): Promise<CallSessionDto>;

  changeStatus(
    id: string,
    input: ChangeCallStatusInput
  ): Promise<CallSessionDto>;

  addTranscriptSegment(
    id: string,
    input: AddTranscriptSegmentInput
  ): Promise<TranscriptSegmentDto>;

  finalize(
    id: string,
    input: FinalizeCallInput
  ): Promise<CallSessionDto>;

  deleteDraft(id: string): Promise<void>;
}

export class CallSessionNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Call session ${id} was not found.`);
    this.name = 'CallSessionNotFoundError';
  }
}

export class PromptTemplateNotFoundForCallError extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(`Prompt template ${id} was not found.`);
    this.name = 'PromptTemplateNotFoundForCallError';
  }
}

export class InvalidCallTransitionError extends Error {
  readonly statusCode = 409;

  constructor(
    currentStatus: CallStatus,
    requestedStatus: CallStatus
  ) {
    super(
      `Call status cannot change from ${currentStatus} to ${requestedStatus}.`
    );

    this.name = 'InvalidCallTransitionError';
  }
}

export class CallNotEditableError extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `Only DRAFT call sessions can be edited. Current status: ${status}.`
    );

    this.name = 'CallNotEditableError';
  }
}

export class CallNotDeletableError extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `Only DRAFT call sessions can be deleted. Current status: ${status}.`
    );

    this.name = 'CallNotDeletableError';
  }
}

export class CallTranscriptNotAllowedError extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `Transcript segments cannot be added while the call status is ${status}.`
    );

    this.name = 'CallTranscriptNotAllowedError';
  }
}

export class CallFinalizeNotAllowedError extends Error {
  readonly statusCode = 409;

  constructor(status: CallStatus) {
    super(
      `Only an IN_PROGRESS call can be finalized. Current status: ${status}.`
    );

    this.name = 'CallFinalizeNotAllowedError';
  }
}

export class CallPromptRequiredError extends Error {
  readonly statusCode = 400;

  constructor() {
    super(
      'A promptTemplateId or non-empty promptText is required.'
    );

    this.name = 'CallPromptRequiredError';
  }
}

const allowedTransitions: Record<
  CallStatus,
  readonly CallStatus[]
> = {
  DRAFT: [
    CallStatus.QUEUED,
    CallStatus.CANCELLED,
  ],

  QUEUED: [
    CallStatus.STARTING,
    CallStatus.CANCELLED,
    CallStatus.FAILED,
  ],

  STARTING: [
    CallStatus.RINGING,
    CallStatus.IN_PROGRESS,
    CallStatus.CANCELLED,
    CallStatus.FAILED,
  ],

  RINGING: [
    CallStatus.IN_PROGRESS,
    CallStatus.CANCELLED,
    CallStatus.FAILED,
  ],

  IN_PROGRESS: [
    CallStatus.COMPLETED,
    CallStatus.CANCELLED,
    CallStatus.FAILED,
  ],

  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

interface TranscriptRecord {
  id: string;
  callSessionId: string;
  sequence: number;
  speaker: TranscriptSpeaker;
  content: string;
  confidence: number | null;
  sentiment: SentimentLabel;
  latencyMs: number | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
  createdAt: Date;
}

interface CallRecord {
  id: string;
  destinationNumber: string;
  promptSnapshot: string;
  promptTemplateId: string | null;
  status: CallStatus;
  languageCode: string;
  provider: string | null;
  providerCallId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  summary: string | null;
  sentiment: SentimentLabel;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  transcriptSegments: TranscriptRecord[];
}

function toTranscriptDto(
  record: TranscriptRecord
): TranscriptSegmentDto {
  return {
    id: record.id,
    callSessionId: record.callSessionId,
    sequence: record.sequence,
    speaker: record.speaker,
    content: record.content,
    confidence: record.confidence,
    sentiment: record.sentiment,
    latencyMs: record.latencyMs,
    startedAtMs: record.startedAtMs,
    endedAtMs: record.endedAtMs,
    createdAt: record.createdAt.toISOString(),
  };
}

function toCallDto(
  record: CallRecord
): CallSessionDto {
  return {
    id: record.id,
    destinationNumber: record.destinationNumber,
    promptSnapshot: record.promptSnapshot,
    promptTemplateId: record.promptTemplateId,
    status: record.status,
    languageCode: record.languageCode,
    provider: record.provider,
    providerCallId: record.providerCallId,
    startedAt: record.startedAt?.toISOString() ?? null,
    endedAt: record.endedAt?.toISOString() ?? null,
    summary: record.summary,
    sentiment: record.sentiment,
    failureReason: record.failureReason,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    transcriptSegments:
      record.transcriptSegments.map(toTranscriptDto),
  };
}

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

function normalizeNullableText(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

async function resolvePrompt(
  prisma: VoiceNexusPrismaClient,
  promptTemplateId: string | null | undefined,
  promptText: string | undefined
): Promise<{
  promptTemplateId: string | null;
  promptSnapshot: string;
}> {
  const suppliedPrompt =
    promptText?.trim() ?? '';

  if (promptTemplateId) {
    const template =
      await prisma.promptTemplate.findUnique({
        where: {
          id: promptTemplateId,
        },

        select: {
          id: true,
          promptText: true,
        },
      });

    if (!template) {
      throw new PromptTemplateNotFoundForCallError(
        promptTemplateId
      );
    }

    return {
      promptTemplateId: template.id,

      promptSnapshot:
        suppliedPrompt !== ''
          ? suppliedPrompt
          : template.promptText,
    };
  }

  if (suppliedPrompt === '') {
    throw new CallPromptRequiredError();
  }

  return {
    promptTemplateId: null,
    promptSnapshot: suppliedPrompt,
  };
}

export function createCallSessionService(
  prisma: VoiceNexusPrismaClient
): CallSessionService {
  async function findCall(
    id: string
  ): Promise<CallRecord> {
    const call =
      await prisma.callSession.findUnique({
        where: {
          id,
        },

        include: {
          transcriptSegments: {
            orderBy: {
              sequence: 'asc',
            },
          },
        },
      });

    if (!call) {
      throw new CallSessionNotFoundError(id);
    }

    return call;
  }

  return {
    async list(
      limit: number
    ): Promise<CallSessionListItemDto[]> {
      const records =
        await prisma.callSession.findMany({
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },

          select: {
            id: true,
            destinationNumber: true,
            status: true,
            languageCode: true,
            provider: true,
            startedAt: true,
            endedAt: true,
            summary: true,
            sentiment: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      return records.map((record) => ({
        id: record.id,
        destinationNumber:
          record.destinationNumber,
        status: record.status,
        languageCode: record.languageCode,
        provider: record.provider,
        startedAt:
          record.startedAt?.toISOString() ??
          null,
        endedAt:
          record.endedAt?.toISOString() ??
          null,
        summary: record.summary,
        sentiment: record.sentiment,
        createdAt:
          record.createdAt.toISOString(),
        updatedAt:
          record.updatedAt.toISOString(),
      }));
    },

    async getById(
      id: string
    ): Promise<CallSessionDto> {
      return toCallDto(await findCall(id));
    },

    async create(
      input: CreateCallSessionInput
    ): Promise<CallSessionDto> {
      const resolvedPrompt =
        await resolvePrompt(
          prisma,
          input.promptTemplateId,
          input.promptText
        );

      const record =
        await prisma.callSession.create({
          data: {
            destinationNumber:
              input.destinationNumber.trim(),

            promptSnapshot:
              resolvedPrompt.promptSnapshot,

            promptTemplateId:
              resolvedPrompt.promptTemplateId,

            languageCode:
              input.languageCode?.trim() ||
              'en-IN',
          },

          include: {
            transcriptSegments: true,
          },
        });

      return toCallDto(record);
    },

    async updateDraft(
      id: string,
      input: UpdateDraftCallInput
    ): Promise<CallSessionDto> {
      const existing =
        await prisma.callSession.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            status: true,
            promptTemplateId: true,
            promptSnapshot: true,
          },
        });

      if (!existing) {
        throw new CallSessionNotFoundError(id);
      }

      if (existing.status !== CallStatus.DRAFT) {
        throw new CallNotEditableError(
          existing.status
        );
      }

      let promptTemplateId:
        | string
        | null
        | undefined;

      let promptSnapshot:
        | string
        | undefined;

      if (
        input.promptTemplateId !== undefined ||
        input.promptText !== undefined
      ) {
        const resolvedPrompt =
          await resolvePrompt(
            prisma,
            input.promptTemplateId !==
            undefined
              ? input.promptTemplateId
              : existing.promptTemplateId,
            input.promptText
          );

        promptTemplateId =
          resolvedPrompt.promptTemplateId;

        promptSnapshot =
          resolvedPrompt.promptSnapshot;
      }

      try {
        const record =
          await prisma.callSession.update({
            where: {
              id,
            },

            data: {
              ...(input.destinationNumber !==
              undefined
                ? {
                    destinationNumber:
                      input.destinationNumber.trim(),
                  }
                : {}),

              ...(input.languageCode !==
              undefined
                ? {
                    languageCode:
                      input.languageCode.trim(),
                  }
                : {}),

              ...(promptTemplateId !== undefined
                ? {
                    promptTemplateId,
                  }
                : {}),

              ...(promptSnapshot !== undefined
                ? {
                    promptSnapshot,
                  }
                : {}),
            },

            include: {
              transcriptSegments: {
                orderBy: {
                  sequence: 'asc',
                },
              },
            },
          });

        return toCallDto(record);
      } catch (error) {
        if (
          getPrismaErrorCode(error) ===
          'P2025'
        ) {
          throw new CallSessionNotFoundError(id);
        }

        throw error;
      }
    },

    async changeStatus(
      id: string,
      input: ChangeCallStatusInput
    ): Promise<CallSessionDto> {
      const existing =
        await prisma.callSession.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        });

      if (!existing) {
        throw new CallSessionNotFoundError(id);
      }

      if (
        !allowedTransitions[
          existing.status
        ].includes(input.status)
      ) {
        throw new InvalidCallTransitionError(
          existing.status,
          input.status
        );
      }

      const now = new Date();

      const terminalStatus =
        input.status ===
          CallStatus.COMPLETED ||
        input.status === CallStatus.FAILED ||
        input.status ===
          CallStatus.CANCELLED;

      const record =
        await prisma.callSession.update({
          where: {
            id,
          },

          data: {
            status: input.status,

            ...(input.provider !== undefined
              ? {
                  provider:
                    normalizeNullableText(
                      input.provider
                    ),
                }
              : {}),

            ...(input.providerCallId !==
            undefined
              ? {
                  providerCallId:
                    normalizeNullableText(
                      input.providerCallId
                    ),
                }
              : {}),

            ...(input.failureReason !==
            undefined
              ? {
                  failureReason:
                    normalizeNullableText(
                      input.failureReason
                    ),
                }
              : {}),

            ...(input.status ===
              CallStatus.IN_PROGRESS &&
            existing.startedAt === null
              ? {
                  startedAt: now,
                }
              : {}),

            ...(terminalStatus
              ? {
                  endedAt: now,
                }
              : {}),
          },

          include: {
            transcriptSegments: {
              orderBy: {
                sequence: 'asc',
              },
            },
          },
        });

      return toCallDto(record);
    },

    async addTranscriptSegment(
      id: string,
      input: AddTranscriptSegmentInput
    ): Promise<TranscriptSegmentDto> {
      const call =
        await prisma.callSession.findUnique({
          where: {
            id,
          },

          select: {
            status: true,
          },
        });

      if (!call) {
        throw new CallSessionNotFoundError(id);
      }

      if (
        call.status !== CallStatus.RINGING &&
        call.status !==
          CallStatus.IN_PROGRESS
      ) {
        throw new CallTranscriptNotAllowedError(
          call.status
        );
      }

      const record =
        await prisma.$transaction(
          async (transaction) => {
            const latest =
              await transaction
                .transcriptSegment
                .findFirst({
                  where: {
                    callSessionId: id,
                  },

                  orderBy: {
                    sequence: 'desc',
                  },

                  select: {
                    sequence: true,
                  },
                });

            return transaction
              .transcriptSegment
              .create({
                data: {
                  callSessionId: id,

                  sequence:
                    (latest?.sequence ?? 0) +
                    1,

                  speaker: input.speaker,

                  content:
                    input.content.trim(),

                  confidence:
                    input.confidence ?? null,

                  sentiment:
                    input.sentiment ??
                    SentimentLabel.UNKNOWN,

                  latencyMs:
                    input.latencyMs ?? null,

                  startedAtMs:
                    input.startedAtMs ?? null,

                  endedAtMs:
                    input.endedAtMs ?? null,
                },
              });
          }
        );

      return toTranscriptDto(record);
    },

    async finalize(
      id: string,
      input: FinalizeCallInput
    ): Promise<CallSessionDto> {
      const existing =
        await prisma.callSession.findUnique({
          where: {
            id,
          },

          select: {
            status: true,
          },
        });

      if (!existing) {
        throw new CallSessionNotFoundError(id);
      }

      if (
        existing.status !==
        CallStatus.IN_PROGRESS
      ) {
        throw new CallFinalizeNotAllowedError(
          existing.status
        );
      }

      const record =
        await prisma.callSession.update({
          where: {
            id,
          },

          data: {
            status: CallStatus.COMPLETED,
            summary: input.summary.trim(),
            sentiment: input.sentiment,
            endedAt: new Date(),
          },

          include: {
            transcriptSegments: {
              orderBy: {
                sequence: 'asc',
              },
            },
          },
        });

      return toCallDto(record);
    },

    async deleteDraft(
      id: string
    ): Promise<void> {
      const existing =
        await prisma.callSession.findUnique({
          where: {
            id,
          },

          select: {
            status: true,
          },
        });

      if (!existing) {
        throw new CallSessionNotFoundError(id);
      }

      if (existing.status !== CallStatus.DRAFT) {
        throw new CallNotDeletableError(
          existing.status
        );
      }

      await prisma.callSession.delete({
        where: {
          id,
        },
      });
    },
  };
}