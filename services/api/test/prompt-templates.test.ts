import assert from 'node:assert/strict';
import {
  randomUUID,
} from 'node:crypto';
import test from 'node:test';

import { buildApp } from '../src/app.js';

import type {
  DependencyManager,
} from '../src/infrastructure/dependency-manager.js';

import {
  PromptTemplateNotFoundError,
  type CreatePromptTemplateInput,
  type PromptTemplateDto,
  type PromptTemplateService,
  type UpdatePromptTemplateInput,
} from '../src/modules/prompt-templates/prompt-template-service.js';

function createDependencies():
DependencyManager {
  return {
    async checkPostgresql() {
      return Promise.resolve();
    },

    async checkRedis() {
      return Promise.resolve();
    },

    async close() {
      return Promise.resolve();
    },
  };
}

function createPromptTemplateStub():
PromptTemplateService {
  const records =
    new Map<
      string,
      PromptTemplateDto
    >();

  return {
    async list() {
      return [...records.values()];
    },

    async getById(id) {
      const record = records.get(id);

      if (!record) {
        throw new PromptTemplateNotFoundError(
          id
        );
      }

      return record;
    },

    async create(
      input:
        CreatePromptTemplateInput
    ) {
      const timestamp =
        new Date().toISOString();

      const record:
      PromptTemplateDto = {
        id: randomUUID(),
        name: input.name,
        description:
          input.description ?? null,
        promptText:
          input.promptText,
        isDefault:
          input.isDefault ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      records.set(
        record.id,
        record
      );

      return record;
    },

    async update(
      id: string,
      input:
        UpdatePromptTemplateInput
    ) {
      const existing =
        records.get(id);

      if (!existing) {
        throw new PromptTemplateNotFoundError(
          id
        );
      }

      const updated:
      PromptTemplateDto = {
        ...existing,

        name:
          input.name ??
          existing.name,

        description:
          input.description !==
          undefined
            ? input.description
            : existing.description,

        promptText:
          input.promptText ??
          existing.promptText,

        isDefault:
          input.isDefault ??
          existing.isDefault,

        updatedAt:
          new Date().toISOString(),
      };

      records.set(id, updated);

      return updated;
    },

    async deleteById(id) {
      if (!records.delete(id)) {
        throw new PromptTemplateNotFoundError(
          id
        );
      }
    },
  };
}

function createTestApp(
  promptTemplates:
    PromptTemplateService
) {
  return buildApp({
    serverOptions: {
      logger: false,
    },

    dependencies:
      createDependencies(),

    promptTemplates,
  });
}

test(
  'prompt template CRUD lifecycle works',
  async (context) => {
    const app = createTestApp(
      createPromptTemplateStub()
    );

    context.after(async () => {
      await app.close();
    });

    const createResponse =
      await app.inject({
        method: 'POST',

        url:
          '/api/v1/prompt-templates',

        payload: {
          name:
            'Appointment confirmation',

          description:
            'Confirm an upcoming appointment.',

          promptText:
            'Call the customer and confirm their appointment.',

          isDefault: true,
        },
      });

    assert.equal(
      createResponse.statusCode,
      201
    );

    const created =
      createResponse.json<
        PromptTemplateDto
      >();

    assert.equal(
      created.name,
      'Appointment confirmation'
    );

    const listResponse =
      await app.inject({
        method: 'GET',

        url:
          '/api/v1/prompt-templates',
      });

    assert.equal(
      listResponse.statusCode,
      200
    );

    assert.equal(
      listResponse.json<{
        count: number;
      }>().count,
      1
    );

    const getResponse =
      await app.inject({
        method: 'GET',

        url:
          `/api/v1/prompt-templates/${created.id}`,
      });

    assert.equal(
      getResponse.statusCode,
      200
    );

    const updateResponse =
      await app.inject({
        method: 'PATCH',

        url:
          `/api/v1/prompt-templates/${created.id}`,

        payload: {
          name:
            'Updated appointment confirmation',
        },
      });

    assert.equal(
      updateResponse.statusCode,
      200
    );

    assert.equal(
      updateResponse.json<{
        name: string;
      }>().name,
      'Updated appointment confirmation'
    );

    const deleteResponse =
      await app.inject({
        method: 'DELETE',

        url:
          `/api/v1/prompt-templates/${created.id}`,
      });

    assert.equal(
      deleteResponse.statusCode,
      200
    );

    assert.deepEqual(
      deleteResponse.json(),
      {
        deleted: true,
        id: created.id,
      }
    );
  }
);

test(
  'prompt template validation rejects blank names',
  async (context) => {
    const app = createTestApp(
      createPromptTemplateStub()
    );

    context.after(async () => {
      await app.close();
    });

    const response =
      await app.inject({
        method: 'POST',

        url:
          '/api/v1/prompt-templates',

        payload: {
          name: '   ',

          promptText:
            'A valid prompt body.',
        },
      });

    assert.equal(
      response.statusCode,
      400
    );
  }
);

test(
  'missing prompt templates return 404',
  async (context) => {
    const app = createTestApp(
      createPromptTemplateStub()
    );

    context.after(async () => {
      await app.close();
    });

    const id = randomUUID();

    const response =
      await app.inject({
        method: 'GET',

        url:
          `/api/v1/prompt-templates/${id}`,
      });

    assert.equal(
      response.statusCode,
      404
    );

    assert.match(
      response.json<{
        message: string;
      }>().message,
      /was not found/
    );
  }
);