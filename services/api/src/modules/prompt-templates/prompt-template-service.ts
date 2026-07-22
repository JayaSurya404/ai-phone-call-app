import type {
  VoiceNexusPrismaClient,
} from '../../infrastructure/prisma.js';

export interface PromptTemplateDto {
  id: string;
  name: string;
  description: string | null;
  promptText: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptTemplateInput {
  name: string;
  description?: string | null;
  promptText: string;
  isDefault?: boolean;
}

export interface UpdatePromptTemplateInput {
  name?: string;
  description?: string | null;
  promptText?: string;
  isDefault?: boolean;
}

export interface PromptTemplateService {
  list(): Promise<PromptTemplateDto[]>;

  getById(
    id: string
  ): Promise<PromptTemplateDto>;

  create(
    input: CreatePromptTemplateInput
  ): Promise<PromptTemplateDto>;

  update(
    id: string,
    input: UpdatePromptTemplateInput
  ): Promise<PromptTemplateDto>;

  deleteById(
    id: string
  ): Promise<void>;
}

interface PromptTemplateRecord {
  id: string;
  name: string;
  description: string | null;
  promptText: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PromptTemplateNotFoundError
  extends Error {
  readonly statusCode = 404;

  constructor(id: string) {
    super(
      `Prompt template ${id} was not found.`
    );

    this.name =
      'PromptTemplateNotFoundError';
  }
}

export class PromptTemplateNameConflictError
  extends Error {
  readonly statusCode = 409;

  constructor(name: string) {
    super(
      `A prompt template named "${name}" already exists.`
    );

    this.name =
      'PromptTemplateNameConflictError';
  }
}

function toDto(
  record: PromptTemplateRecord
): PromptTemplateDto {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    promptText: record.promptText,
    isDefault: record.isDefault,
    createdAt:
      record.createdAt.toISOString(),
    updatedAt:
      record.updatedAt.toISOString(),
  };
}

function normalizeDescription(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue === ''
    ? null
    : trimmedValue;
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

export function createPromptTemplateService(
  prisma: VoiceNexusPrismaClient
): PromptTemplateService {
  return {
    async list(): Promise<
      PromptTemplateDto[]
    > {
      const records =
        await prisma.promptTemplate.findMany({
          orderBy: [
            {
              isDefault: 'desc',
            },
            {
              updatedAt: 'desc',
            },
          ],
        });

      return records.map(toDto);
    },

    async getById(
      id: string
    ): Promise<PromptTemplateDto> {
      const record =
        await prisma.promptTemplate.findUnique({
          where: {
            id,
          },
        });

      if (!record) {
        throw new PromptTemplateNotFoundError(
          id
        );
      }

      return toDto(record);
    },

    async create(
      input: CreatePromptTemplateInput
    ): Promise<PromptTemplateDto> {
      const name = input.name.trim();

      try {
        return await prisma.$transaction(
          async (transaction) => {
            if (input.isDefault === true) {
              await transaction
                .promptTemplate
                .updateMany({
                  data: {
                    isDefault: false,
                  },
                });
            }

            const record =
              await transaction
                .promptTemplate
                .create({
                  data: {
                    name,

                    description:
                      normalizeDescription(
                        input.description
                      ) ?? null,

                    promptText:
                      input.promptText.trim(),

                    isDefault:
                      input.isDefault ?? false,
                  },
                });

            return toDto(record);
          }
        );
      } catch (error) {
        if (
          getPrismaErrorCode(error) ===
          'P2002'
        ) {
          throw new PromptTemplateNameConflictError(
            name
          );
        }

        throw error;
      }
    },

    async update(
      id: string,
      input: UpdatePromptTemplateInput
    ): Promise<PromptTemplateDto> {
      const existing =
        await prisma.promptTemplate.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
          },
        });

      if (!existing) {
        throw new PromptTemplateNotFoundError(
          id
        );
      }

      const normalizedDescription =
        normalizeDescription(
          input.description
        );

      const data = {
        ...(input.name !== undefined
          ? {
              name: input.name.trim(),
            }
          : {}),

        ...(normalizedDescription !==
        undefined
          ? {
              description:
                normalizedDescription,
            }
          : {}),

        ...(input.promptText !== undefined
          ? {
              promptText:
                input.promptText.trim(),
            }
          : {}),

        ...(input.isDefault !== undefined
          ? {
              isDefault:
                input.isDefault,
            }
          : {}),
      };

      try {
        return await prisma.$transaction(
          async (transaction) => {
            if (
              input.isDefault === true
            ) {
              await transaction
                .promptTemplate
                .updateMany({
                  where: {
                    id: {
                      not: id,
                    },
                  },

                  data: {
                    isDefault: false,
                  },
                });
            }

            const record =
              await transaction
                .promptTemplate
                .update({
                  where: {
                    id,
                  },

                  data,
                });

            return toDto(record);
          }
        );
      } catch (error) {
        const errorCode =
          getPrismaErrorCode(error);

        if (errorCode === 'P2002') {
          throw new PromptTemplateNameConflictError(
            input.name?.trim() ??
              'unknown'
          );
        }

        if (errorCode === 'P2025') {
          throw new PromptTemplateNotFoundError(
            id
          );
        }

        throw error;
      }
    },

    async deleteById(
      id: string
    ): Promise<void> {
      try {
        await prisma.promptTemplate.delete({
          where: {
            id,
          },
        });
      } catch (error) {
        if (
          getPrismaErrorCode(error) ===
          'P2025'
        ) {
          throw new PromptTemplateNotFoundError(
            id
          );
        }

        throw error;
      }
    },
  };
}