import type {
  FastifyPluginAsync,
} from 'fastify';

import type {
  WebSocket,
} from '@fastify/websocket';

import type {
  CallRealtimeHub,
} from '../infrastructure/call-realtime-hub.js';

import type {
  CallSessionService,
} from '../modules/calls/call-session-service.js';

import {
  createCallRealtimeEvent,
} from '../modules/realtime/event-factory.js';

interface RealtimeRouteOptions {
  calls:
    CallSessionService;

  hub:
    CallRealtimeHub;

  clientToken: string;

  heartbeatMs: number;
}

interface CallParams {
  id: string;
}

interface RealtimeQuery {
  token: string;
}

interface ClientMessage {
  type:
    | 'ping'
    | 'resync';
}

const uuidPattern =
  '^[0-9a-fA-F]{8}-' +
  '[0-9a-fA-F]{4}-' +
  '[1-5][0-9a-fA-F]{3}-' +
  '[89abAB][0-9a-fA-F]{3}-' +
  '[0-9a-fA-F]{12}$';

function isOpen(
  socket: WebSocket
): boolean {
  return socket.readyState === 1;
}

function sendJson(
  socket: WebSocket,
  value: unknown
): void {
  if (!isOpen(socket)) {
    return;
  }

  socket.send(
    JSON.stringify(value)
  );
}

function parseClientMessage(
  data: Buffer
): ClientMessage | null {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        data.toString(
          'utf8'
        )
      ) as unknown;
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    typeof parsed.type !==
      'string'
  ) {
    return null;
  }

  if (
    parsed.type !== 'ping' &&
    parsed.type !== 'resync'
  ) {
    return null;
  }

  return {
    type: parsed.type,
  };
}

export const realtimeRoutes:
FastifyPluginAsync<
  RealtimeRouteOptions
> = async (app, options) => {
  app.get<{
    Params: CallParams;
    Querystring:
      RealtimeQuery;
  }>(
    '/calls/:id',

    {
      websocket: true,

      schema: {
        params: {
          type: 'object',
          additionalProperties:
            false,
          required: ['id'],

          properties: {
            id: {
              type: 'string',
              pattern:
                uuidPattern,
            },
          },
        },

        querystring: {
          type: 'object',
          additionalProperties:
            false,
          required: ['token'],

          properties: {
            token: {
              type: 'string',
              minLength: 1,
            },
          },
        },
      },
    },

    (
      socket,
      request
    ) => {
      let unsubscribe:
        | (() => Promise<void>)
        | undefined;

      let heartbeat:
        NodeJS.Timeout |
        undefined;

      let closed = false;

      async function cleanup():
      Promise<void> {
        if (closed) {
          return;
        }

        closed = true;

        if (heartbeat) {
          clearInterval(
            heartbeat
          );
        }

        if (unsubscribe) {
          await unsubscribe();
        }
      }

      async function sendSnapshot():
      Promise<void> {
        const call =
          await options.calls
            .getById(
              request.params.id
            );

        sendJson(
          socket,

          createCallRealtimeEvent(
            call.id,

            'call.snapshot',

            {
              call,
            }
          )
        );
      }

      socket.on(
        'message',

        (data) => {
          void (
            async () => {
              const message =
                parseClientMessage(
                  Buffer.isBuffer(
                    data
                  )
                    ? data
                    : Buffer.from(
                        data.toString()
                      )
                );

              if (!message) {
                sendJson(
                  socket,
                  {
                    type: 'error',
                    message:
                      'Unsupported realtime message.',
                  }
                );

                return;
              }

              if (
                message.type ===
                'ping'
              ) {
                sendJson(
                  socket,

                  createCallRealtimeEvent(
                    request.params.id,

                    'heartbeat',

                    {
                      serverTime:
                        new Date()
                          .toISOString(),
                    }
                  )
                );

                return;
              }

              await sendSnapshot();
            }
          )().catch(
            (error: unknown) => {
              sendJson(
                socket,
                {
                  type: 'error',

                  message:
                    error instanceof
                    Error
                      ? error.message
                      : String(
                          error
                        ),
                }
              );
            }
          );
        }
      );

      socket.on(
        'close',
        () => {
          void cleanup();
        }
      );

      socket.on(
        'error',
        () => {
          void cleanup();
        }
      );

      void (
        async () => {
          if (
            request.query.token !==
            options.clientToken
          ) {
            socket.close(
              1008,
              'Invalid realtime token.'
            );

            return;
          }

          await options.calls
            .getById(
              request.params.id
            );

          unsubscribe =
            await options.hub
              .subscribe(
                request.params.id,

                (event) => {
                  sendJson(
                    socket,
                    event
                  );
                }
              );

          await sendSnapshot();

          heartbeat =
            setInterval(
              () => {
                sendJson(
                  socket,

                  createCallRealtimeEvent(
                    request.params.id,

                    'heartbeat',

                    {
                      serverTime:
                        new Date()
                          .toISOString(),
                    }
                  )
                );
              },

              options.heartbeatMs
            );
        }
      )().catch(
        (error: unknown) => {
          sendJson(
            socket,
            {
              type: 'error',

              message:
                error instanceof
                Error
                  ? error.message
                  : String(error),
            }
          );

          socket.close(
            1011,
            'Realtime setup failed.'
          );

          void cleanup();
        }
      );
    }
  );
};