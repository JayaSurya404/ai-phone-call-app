import type {
  FastifyPluginAsync,
  FastifyRequest,
} from 'fastify';

import {
  scenarioIds,
  type StartSimulatorSessionInput,
} from '../domain/contracts.js';

import {
  SimulatorSessionNotFoundError,
  type SessionManager,
} from '../services/session-manager.js';

interface SessionRouteOptions {
  internalToken: string;
  sessions: SessionManager;
}

interface SessionParams {
  id: string;
}

function authorize(
  request: FastifyRequest,
  token: string
): void {
  const authorization =
    request.headers.authorization;

  if (
    authorization !==
    `Bearer ${token}`
  ) {
    const error = new Error(
      'A valid simulator internal token is required.'
    );

    Object.assign(error, {
      name:
        'SimulatorUnauthorizedError',
      statusCode: 401,
    });

    throw error;
  }
}

export const sessionRoutes:
FastifyPluginAsync<
  SessionRouteOptions
> = async (app, options) => {
  app.addHook(
    'preHandler',
    async (request) => {
      authorize(
        request,
        options.internalToken
      );
    }
  );

  app.post<{
    Body: StartSimulatorSessionInput;
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'callSessionId',
            'destinationNumber',
            'promptSnapshot',
            'languageCode',
          ],
          properties: {
            callSessionId: {
              type: 'string',
              minLength: 1,
            },
            destinationNumber: {
              type: 'string',
              minLength: 3,
              maxLength: 32,
            },
            promptSnapshot: {
              type: 'string',
              minLength: 1,
              maxLength: 20_000,
            },
            languageCode: {
              type: 'string',
              minLength: 2,
              maxLength: 16,
            },
            scenarioId: {
              type: 'string',
              enum: scenarioIds,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session =
        await options.sessions.start(
          request.body
        );

      return reply
        .status(201)
        .send(session);
    }
  );

  app.get<{
    Params: SessionParams;
  }>(
    '/:id',
    async (request) => {
      const session =
        options.sessions.getById(
          request.params.id
        );

      if (!session) {
        throw new SimulatorSessionNotFoundError(
          request.params.id
        );
      }

      return session;
    }
  );

  app.delete<{
    Params: SessionParams;
  }>(
    '/:id',
    async (request) => {
      return options.sessions.cancel(
        request.params.id
      );
    }
  );
};