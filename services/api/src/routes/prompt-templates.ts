import type {
  FastifyPluginAsync,
} from 'fastify';

import type {
  CreatePromptTemplateInput,
  PromptTemplateDto,
  PromptTemplateService,
  UpdatePromptTemplateInput,
} from '../modules/prompt-templates/prompt-template-service.js';

interface PromptTemplateRouteOptions {
  promptTemplates:
    PromptTemplateService;
}

interface PromptTemplateParams {
  id: string;
}

interface PromptTemplateListResponse {
  items: PromptTemplateDto[];
  count: number;
}

interface DeletePromptTemplateResponse {
  deleted: true;
  id: string;
}

const uuidPattern =
  '^[0-9a-fA-F]{8}-' +
  '[0-9a-fA-F]{4}-' +
  '[1-5][0-9a-fA-F]{3}-' +
  '[89abAB][0-9a-fA-F]{3}-' +
  '[0-9a-fA-F]{12}$';

const nullableDescriptionSchema = {
  anyOf: [
    {
      type: 'string',
      maxLength: 500,
    },
    {
      type: 'null',
    },
  ],
} as const;

const promptTemplateSchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'id',
    'name',
    'description',
    'promptText',
    'isDefault',
    'createdAt',
    'updatedAt',
  ],

  properties: {
    id: {
      type: 'string',
    },

    name: {
      type: 'string',
    },

    description:
      nullableDescriptionSchema,

    promptText: {
      type: 'string',
    },

    isDefault: {
      type: 'boolean',
    },

    createdAt: {
      type: 'string',
    },

    updatedAt: {
      type: 'string',
    },
  },
} as const;

const promptTemplateParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],

  properties: {
    id: {
      type: 'string',
      pattern: uuidPattern,
    },
  },
} as const;

const createPromptTemplateBodySchema = {
  type: 'object',
  additionalProperties: false,

  required: [
    'name',
    'promptText',
  ],

  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      pattern: '\\S',
    },

    description:
      nullableDescriptionSchema,

    promptText: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
    },

    isDefault: {
      type: 'boolean',
      default: false,
    },
  },
} as const;

const updatePromptTemplateBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,

  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      pattern: '\\S',
    },

    description:
      nullableDescriptionSchema,

    promptText: {
      type: 'string',
      minLength: 1,
      maxLength: 20_000,
      pattern: '\\S',
    },

    isDefault: {
      type: 'boolean',
    },
  },
} as const;

export const promptTemplateRoutes:
FastifyPluginAsync<
  PromptTemplateRouteOptions
> = async (app, options) => {
  app.get<{
    Reply: PromptTemplateListResponse;
  }>(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: [
              'items',
              'count',
            ],

            properties: {
              items: {
                type: 'array',
                items:
                  promptTemplateSchema,
              },

              count: {
                type: 'integer',
                minimum: 0,
              },
            },
          },
        },
      },
    },

    async () => {
      const items =
        await options.promptTemplates.list();

      return {
        items,
        count: items.length,
      };
    }
  );

  app.post<{
    Body: CreatePromptTemplateInput;
    Reply: PromptTemplateDto;
  }>(
    '/',
    {
      schema: {
        body:
          createPromptTemplateBodySchema,

        response: {
          201: promptTemplateSchema,
        },
      },
    },

    async (request, reply) => {
      const created =
        await options.promptTemplates.create(
          request.body
        );

      return reply
        .status(201)
        .send(created);
    }
  );

  app.get<{
    Params: PromptTemplateParams;
    Reply: PromptTemplateDto;
  }>(
    '/:id',
    {
      schema: {
        params:
          promptTemplateParamsSchema,

        response: {
          200: promptTemplateSchema,
        },
      },
    },

    async (request) => {
      return options.promptTemplates
        .getById(request.params.id);
    }
  );

  app.patch<{
    Params: PromptTemplateParams;
    Body: UpdatePromptTemplateInput;
    Reply: PromptTemplateDto;
  }>(
    '/:id',
    {
      schema: {
        params:
          promptTemplateParamsSchema,

        body:
          updatePromptTemplateBodySchema,

        response: {
          200: promptTemplateSchema,
        },
      },
    },

    async (request) => {
      return options.promptTemplates
        .update(
          request.params.id,
          request.body
        );
    }
  );

  app.delete<{
    Params: PromptTemplateParams;
    Reply:
      DeletePromptTemplateResponse;
  }>(
    '/:id',
    {
      schema: {
        params:
          promptTemplateParamsSchema,

        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: [
              'deleted',
              'id',
            ],

            properties: {
              deleted: {
                type: 'boolean',
                const: true,
              },

              id: {
                type: 'string',
              },
            },
          },
        },
      },
    },

    async (request) => {
      await options.promptTemplates
        .deleteById(
          request.params.id
        );

      return {
        deleted: true,
        id: request.params.id,
      };
    }
  );
};