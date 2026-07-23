import {
  randomUUID,
} from 'node:crypto';

import formbody
  from '@fastify/formbody';

import websocket
  from '@fastify/websocket';

import Fastify
  from 'fastify';

import twilio
  from 'twilio';

import type {
  WebSocket,
} from 'ws';

import {
  sendProviderEvent,
} from './callback-client.js';

import {
  loadGatewayEnvironment,
} from './config.js';

import {
  generateGeminiReply,
} from './gemini.js';

import type {
  ActiveGatewayCall,
  StartCallInput,
} from './types.js';

import {
  buildConversationRelayTwiml,
} from './xml.js';

const environment =
  loadGatewayEnvironment();

const app =
  Fastify({
    logger: true,
    bodyLimit: 1024 * 1024,
  });

await app.register(
  formbody
);

await app.register(
  websocket
);

const twilioClient =
  twilio(
    environment
      .twilioAccountSid,

    environment
      .twilioAuthToken
  );

const callsByInternalId =
  new Map<
    string,
    ActiveGatewayCall
  >();

const callsByProviderId =
  new Map<
    string,
    ActiveGatewayCall
  >();

function authorizationValid(
  authorization:
    string | undefined
): boolean {
  return (
    authorization ===
    `Bearer ${environment.bearerToken}`
  );
}

function getCall(
  callSessionId:
    string | undefined,
  providerCallId?:
    string | undefined
): ActiveGatewayCall | null {
  if (callSessionId) {
    const call =
      callsByInternalId.get(
        callSessionId
      );

    if (call) {
      return call;
    }
  }

  if (providerCallId) {
    return (
      callsByProviderId.get(
        providerCallId
      ) ??
      null
    );
  }

  return null;
}

function summaryFor(
  call: ActiveGatewayCall
): string {
  const userTurns =
    call.transcript.filter(
      (item) =>
        item.speaker ===
        'REMOTE_PARTY'
    ).length;

  const aiTurns =
    call.transcript.filter(
      (item) =>
        item.speaker ===
        'AI_AGENT'
    ).length;

  if (
    userTurns === 0 &&
    aiTurns === 0
  ) {
    return (
      'The call ended before a conversation was recorded.'
    );
  }

  return (
    `The AI phone call completed with ` +
    `${userTurns} caller message` +
    `${userTurns === 1 ? '' : 's'} and ` +
    `${aiTurns} AI response` +
    `${aiTurns === 1 ? '' : 's'}.`
  );
}

async function completeCall(
  call: ActiveGatewayCall
): Promise<void> {
  if (
    call.completedSent
  ) {
    return;
  }

  call.completedSent = true;

  if (call.timeout) {
    clearTimeout(
      call.timeout
    );
  }

  await sendProviderEvent(
    call,
    'completed',
    {
      summary:
        summaryFor(call),

      sentiment:
        'NEUTRAL',
    }
  );
}

function sendText(
  socket: WebSocket,
  text: string,
  language: string
): void {
  socket.send(
    JSON.stringify({
      type: 'text',
      token: text,
      last: true,
      lang: language,
      interruptible: true,
      preemptible: true,
    })
  );
}

function validStartInput(
  value: unknown
): value is StartCallInput {
  if (
    typeof value !==
      'object' ||
    value === null
  ) {
    return false;
  }

  const input =
    value as Partial<
      StartCallInput
    >;

  return (
    typeof input.callSessionId ===
      'string' &&
    input.callSessionId.trim() !==
      '' &&
    typeof input.destinationNumber ===
      'string' &&
    input.destinationNumber.trim() !==
      '' &&
    typeof input.promptSnapshot ===
      'string' &&
    input.promptSnapshot.trim() !==
      '' &&
    typeof input.languageCode ===
      'string' &&
    typeof input.callback ===
      'object' &&
    input.callback !== null &&
    typeof input.callback.url ===
      'string' &&
    typeof input.callback.signingSecret ===
      'string'
  );
}

app.get(
  '/health',
  async () => ({
    status: 'ok',
    service:
      'voicenexus-twilio-gateway',
    provider:
      'twilio-conversation-relay',
  })
);

app.post<{
  Body: StartCallInput;
}>(
  '/v1/calls',

  async (
    request,
    reply
  ) => {
    if (
      !authorizationValid(
        request.headers
          .authorization
      )
    ) {
      return reply
        .code(401)
        .send({
          message:
            'Unauthorized.',
        });
    }

    if (
      !validStartInput(
        request.body
      )
    ) {
      return reply
        .code(400)
        .send({
          message:
            'Invalid call request.',
        });
    }

    const input =
      request.body;

    const statusCallbackUrl =
      `${environment.publicBaseUrl}` +
      `/twilio/status?callSessionId=` +
      encodeURIComponent(
        input.callSessionId
      );

    const actionUrl =
      `${environment.publicBaseUrl}` +
      `/twilio/connect-action?callSessionId=` +
      encodeURIComponent(
        input.callSessionId
      );

    const conversationUrl =
      `${environment.publicWebSocketUrl}` +
      `/twilio/conversation`;

    const twiml =
      buildConversationRelayTwiml({
        webSocketUrl:
          conversationUrl,

        callSessionId:
          input.callSessionId,

        welcomeGreeting:
          environment
            .welcomeGreeting,

        language:
          environment
            .conversationLanguage,

        actionUrl,
      });

    try {
      const created =
        await twilioClient
          .calls
          .create({
            to:
              input
                .destinationNumber,

            from:
              environment
                .twilioPhoneNumber,

            twiml,

            statusCallback:
              statusCallbackUrl,

            statusCallbackMethod:
              'POST',

            statusCallbackEvent: [
              'initiated',
              'ringing',
              'answered',
              'completed',
            ],

            timeout: 20,
          });

      const state:
        ActiveGatewayCall = {
          callSessionId:
            input.callSessionId,

          providerCallId:
            created.sid,

          destinationNumber:
            input
              .destinationNumber,

          promptSnapshot:
            input
              .promptSnapshot,

          languageCode:
            input.languageCode,

          callback:
            input.callback,

          history: [],

          transcript: [
            {
              speaker:
                'AI_AGENT',

              content:
                environment
                  .welcomeGreeting,
            },
          ],

          createdAt:
            new Date()
              .toISOString(),

          connectedSent:
            false,

          completedSent:
            false,
        };

      state.timeout =
        setTimeout(
          () => {
            void twilioClient
              .calls(
                created.sid
              )
              .update({
                status:
                  'completed',
              })
              .catch(
                (error) => {
                  app.log.error(
                    error,
                    'Failed to enforce call time limit.'
                  );
                }
              );
          },
          environment
            .maxCallSeconds *
          1000
        );

      callsByInternalId.set(
        state.callSessionId,
        state
      );

      callsByProviderId.set(
        state.providerCallId,
        state
      );

      return reply
        .code(201)
        .send({
          id:
            created.sid,

          providerCallId:
            created.sid,
        });
    } catch (error) {
      app.log.error(
        error,
        'Twilio outbound call failed.'
      );

      return reply
        .code(502)
        .send({
          message:
            error instanceof Error
              ? error.message
              : 'Twilio could not create the outbound call.',
        });
    }
  }
);

app.delete<{
  Params: {
    id: string;
  };
}>(
  '/v1/calls/:id',

  async (
    request,
    reply
  ) => {
    if (
      !authorizationValid(
        request.headers
          .authorization
      )
    ) {
      return reply
        .code(401)
        .send({
          message:
            'Unauthorized.',
        });
    }

    const call =
      getCall(
        undefined,
        request.params.id
      );

    try {
      await twilioClient
        .calls(
          request.params.id
        )
        .update({
          status: 'completed',
        });

      if (call) {
        await sendProviderEvent(
          call,
          'cancelled',
          {
            reason:
              'Cancelled from the mobile app.',
          }
        );
      }

      return reply
        .code(204)
        .send();
    } catch (error) {
      app.log.error(
        error,
        'Twilio cancellation failed.'
      );

      return reply
        .code(502)
        .send({
          message:
            error instanceof Error
              ? error.message
              : 'Twilio could not cancel the call.',
        });
    }
  }
);

app.post<{
  Querystring: {
    callSessionId?:
      string;
  };
  Body: Record<
    string,
    string | undefined
  >;
}>(
  '/twilio/status',

  async (
    request,
    reply
  ) => {
    const callSid =
      request.body.CallSid;

    const callStatus =
      request.body.CallStatus
        ?.toLowerCase();

    const call =
      getCall(
        request.query
          .callSessionId,
        callSid
      );

    if (!call) {
      app.log.warn(
        {
          callSid,
          callStatus,
        },
        'Status callback arrived before gateway state was available.'
      );

      return reply
        .code(204)
        .send();
    }

    try {
      switch (callStatus) {
        case 'ringing':
          await sendProviderEvent(
            call,
            'ringing'
          );
          break;

        case 'in-progress':
          if (
            !call.connectedSent
          ) {
            call.connectedSent =
              true;

            await sendProviderEvent(
              call,
              'connected'
            );

            await sendProviderEvent(
              call,
              'transcript',
              {
                speaker:
                  'AI_AGENT',

                content:
                  environment
                    .welcomeGreeting,

                sentiment:
                  'NEUTRAL',
              }
            );
          }
          break;

        case 'completed':
          await completeCall(
            call
          );
          break;

        case 'canceled':
          await sendProviderEvent(
            call,
            'cancelled',
            {
              reason:
                'Twilio reported that the call was cancelled.',
            }
          );
          break;

        case 'busy':
        case 'failed':
        case 'no-answer':
          await sendProviderEvent(
            call,
            'failed',
            {
              reason:
                `Twilio call status: ${callStatus}.`,
            }
          );
          break;

        default:
          break;
      }
    } catch (error) {
      app.log.error(
        error,
        'Failed to forward Twilio status.'
      );
    }

    return reply
      .code(204)
      .send();
  }
);

app.post(
  '/twilio/connect-action',

  async (
    _request,
    reply
  ) => {
    return reply
      .type('text/xml')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>'
      );
  }
);

app.get(
  '/twilio/conversation',
  {
    websocket: true,
  },

  (
    socket,
    request
  ) => {
    if (
      environment
        .twilioValidateSignatures
    ) {
      const signature =
        request.headers[
          'x-twilio-signature'
        ];

      const valid =
        typeof signature ===
          'string' &&
        twilio.validateRequest(
          environment
            .twilioAuthToken,

          signature,

          `${environment.publicWebSocketUrl}${request.url}`,

          {}
        );

      if (!valid) {
        socket.close(
          1008,
          'Invalid Twilio signature.'
        );

        return;
      }
    }

    let activeCall:
      ActiveGatewayCall | null =
      null;

    let processing =
      Promise.resolve();

    socket.on(
      'message',

      (data) => {
        processing =
          processing
            .then(
              async () => {
                const message =
                  JSON.parse(
                    data.toString()
                  ) as {
                    type?: string;
                    sessionId?: string;
                    callSid?: string;
                    customParameters?: {
                      callSessionId?:
                        string;
                    };
                    voicePrompt?:
                      string;
                    lang?: string;
                    last?: boolean;
                    description?: string;
                  };

                if (
                  message.type ===
                  'setup'
                ) {
                  activeCall =
                    getCall(
                      message
                        .customParameters
                        ?.callSessionId,

                      message.callSid
                    );

                  if (!activeCall) {
                    socket.close(
                      1008,
                      'Unknown call session.'
                    );

                    return;
                  }

                  return;
                }

                if (
                  message.type ===
                    'prompt' &&
                  message.last ===
                    true &&
                  activeCall
                ) {
                  const callerText =
                    message.voicePrompt
                      ?.trim();

                  if (!callerText) {
                    return;
                  }

                  const startedAt =
                    Date.now();

                  activeCall
                    .history
                    .push({
                      role: 'user',
                      text:
                        callerText,
                    });

                  activeCall
                    .transcript
                    .push({
                      speaker:
                        'REMOTE_PARTY',

                      content:
                        callerText,
                    });

                  await sendProviderEvent(
                    activeCall,
                    'transcript',
                    {
                      speaker:
                        'REMOTE_PARTY',

                      content:
                        callerText,

                      confidence:
                        null,

                      sentiment:
                        'NEUTRAL',

                      latencyMs:
                        null,
                    }
                  );

                  try {
                    const response =
                      await generateGeminiReply({
                        apiKey:
                          environment
                            .geminiApiKey,

                        model:
                          environment
                            .geminiModel,

                        systemPrompt:
                          [
                            activeCall
                              .promptSnapshot,

                            'You are speaking during a real phone call.',

                            'Speak naturally, warmly, and briefly.',

                            'Use one to three short sentences.',

                            'Do not use markdown, bullet points, emojis, or stage directions.',

                            'Never claim to be human. Clearly remain an AI assistant.',
                          ].join(
                            '\n'
                          ),

                        history:
                          activeCall
                            .history
                            .slice(-12),
                      });

                    activeCall
                      .history
                      .push({
                        role: 'model',
                        text:
                          response,
                      });

                    activeCall
                      .transcript
                      .push({
                        speaker:
                          'AI_AGENT',

                        content:
                          response,
                      });

                    const latency =
                      Date.now() -
                      startedAt;

                    await sendProviderEvent(
                      activeCall,
                      'transcript',
                      {
                        speaker:
                          'AI_AGENT',

                        content:
                          response,

                        sentiment:
                          'NEUTRAL',

                        latencyMs:
                          latency,
                      }
                    );

                    sendText(
                      socket,
                      response,
                      message.lang ||
                      environment
                        .conversationLanguage
                    );
                  } catch (error) {
                    app.log.error(
                      error,
                      'Gemini response failed.'
                    );

                    const fallback =
                      'Sorry, I had a brief connection issue. Please say that again.';

                    sendText(
                      socket,
                      fallback,
                      message.lang ||
                      environment
                        .conversationLanguage
                    );
                  }

                  return;
                }

                if (
                  message.type ===
                  'error'
                ) {
                  app.log.error(
                    {
                      description:
                        message
                          .description,
                    },
                    'ConversationRelay error.'
                  );
                }
              }
            )
            .catch(
              (error) => {
                app.log.error(
                  error,
                  'Conversation message failed.'
                );
              }
            );
      }
    );

    socket.on(
      'close',

      () => {
        if (activeCall) {
          app.log.info(
            {
              callSessionId:
                activeCall
                  .callSessionId,
            },
            'ConversationRelay socket closed.'
          );
        }
      }
    );
  }
);

await app.listen({
  host:
    environment.host,

  port:
    environment.port,
});

app.log.info(
  {
    port:
      environment.port,

    publicBaseUrl:
      environment
        .publicBaseUrl,

    provider:
      'twilio-conversation-relay',

    maxCallSeconds:
      environment
        .maxCallSeconds,
  },
  'VoiceNexus Twilio gateway started.'
);