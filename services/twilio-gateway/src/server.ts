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
  ProviderEventType,
  ProviderEventValues,
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

function reportProviderEvent(
  call: ActiveGatewayCall,
  type: ProviderEventType,
  values:
    ProviderEventValues = {}
): void {
  void sendProviderEvent(
    call,
    type,
    values
  ).catch(
    (error) => {
      app.log.error(
        {
          error:
            error instanceof Error
              ? error.message
              : String(error),

          type,

          callSessionId:
            call.callSessionId,

          providerCallId:
            call.providerCallId,
        },

        'Provider callback delivery failed.'
      );
    }
  );
}

function ensureConnected(
  call: ActiveGatewayCall
): void {
  if (
    call.connectedSent
  ) {
    return;
  }

  call.connectedSent = true;

  reportProviderEvent(
    call,
    'connected'
  );

  reportProviderEvent(
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

      latencyMs: 0,
    }
  );
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
    `The real AI phone call completed with ` +
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

  try {
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
  } catch (error) {
    app.log.error(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),

        callSessionId:
          call.callSessionId,
      },

      'Final callback delivery failed.'
    );
  }
}

function sendText(
  socket: WebSocket,
  text: string
): void {
  socket.send(
    JSON.stringify({
      type: 'text',
      token: text,
      last: true,

      // ElevenLabs detects the
      // response language.
      lang: 'multi',

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

function agentSystemPrompt(
  call: ActiveGatewayCall
): string {
  return [
    call.promptSnapshot,

    '',

    'You are VoiceNexus, an AI voice agent speaking during a real telephone call.',

    'Follow the requested business purpose and move the call toward a clear outcome.',

    'Sound warm, calm, confident, and conversational, but never pretend to be a human.',

    'Use short natural spoken sentences. Usually answer in one or two sentences.',

    'Acknowledge what the caller said before asking the next useful question.',

    'Ask only one question at a time.',

    'Never use markdown, bullet points, emojis, headings, stage directions, or URLs.',

    'Avoid repeating the same greeting or repeating the caller word for word.',

    'Automatically understand the caller language and reply in that same language.',

    'Support natural code-switching between English and Indian languages when the caller does it.',

    'For Tamil, Hindi, or another language, write the response in that language so multilingual TTS speaks it correctly.',

    'If audio is unclear, politely ask one short clarification question.',

    'When the task is complete, confirm the result and close the call politely.',
  ].join('\n');
}

async function handleCallerPrompt(
  socket: WebSocket,
  call: ActiveGatewayCall,
  callerText: string
): Promise<void> {
  const now =
    Date.now();

  if (
    call.lastCallerText ===
      callerText &&
    call.lastCallerAtMs !==
      undefined &&
    now -
      call.lastCallerAtMs <
      1_500
  ) {
    app.log.info(
      {
        callSessionId:
          call.callSessionId,
        callerText,
      },

      'Duplicate final prompt ignored.'
    );

    return;
  }

  call.lastCallerText =
    callerText;

  call.lastCallerAtMs =
    now;

  const startedAt =
    Date.now();

  call.history.push({
    role: 'user',
    text:
      callerText,
  });

  call.transcript.push({
    speaker:
      'REMOTE_PARTY',

    content:
      callerText,
  });

  // Never block Gemini on the
  // dashboard callback.
  reportProviderEvent(
    call,
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

  app.log.info(
    {
      callSessionId:
        call.callSessionId,

      callerText,
    },

    'Final caller prompt received.'
  );

  let responseText:
    string;

  try {
    responseText =
      await generateGeminiReply({
        apiKey:
          environment
            .geminiApiKey,

        model:
          environment
            .geminiModel,

        systemPrompt:
          agentSystemPrompt(
            call
          ),

        history:
          call.history
            .slice(-16),
      });
  } catch (error) {
    app.log.error(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),

        callSessionId:
          call.callSessionId,

        model:
          environment
            .geminiModel,
      },

      'Gemini response failed.'
    );

    responseText =
      (
        'Sorry, I had a brief AI connection issue. ' +
        'Please say that once more.'
      );
  }

  const latency =
    Date.now() -
    startedAt;

  // Speak first. Monitoring must
  // never delay the live call.
  sendText(
    socket,
    responseText
  );

  call.history.push({
    role: 'model',
    text:
      responseText,
  });

  call.transcript.push({
    speaker:
      'AI_AGENT',

    content:
      responseText,
  });

  reportProviderEvent(
    call,
    'transcript',
    {
      speaker:
        'AI_AGENT',

      content:
        responseText,

      sentiment:
        'NEUTRAL',

      latencyMs:
        latency,
    }
  );

  app.log.info(
    {
      callSessionId:
        call.callSessionId,

      latencyMs:
        latency,

      responseText,
    },

    'AI response sent to Twilio.'
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

    languageMode:
      'automatic-multilingual',

    geminiModel:
      environment
        .geminiModel,
  })
);

app.get(
  '/v1/diagnostics',

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

    try {
      const geminiReply =
        await generateGeminiReply({
          apiKey:
            environment
              .geminiApiKey,

          model:
            environment
              .geminiModel,

          systemPrompt:
            (
              'This is a connectivity test. ' +
              'Reply with READY only.'
            ),

          history: [
            {
              role: 'user',
              text: 'Test now.',
            },
          ],
        });

      return {
        status: 'ready',

        twilioConfigured:
          environment
            .twilioAccountSid
            .startsWith('AC'),

        gemini: {
          model:
            environment
              .geminiModel,

          response:
            geminiReply,
        },

        languageMode:
          'multi',
      };
    } catch (error) {
      return reply
        .code(502)
        .send({
          status:
            'not-ready',

          message:
            error instanceof Error
              ? error.message
              : String(error),
        });
    }
  }
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
      (
        `${environment.publicBaseUrl}` +
        `/twilio/status?callSessionId=`
      ) +
      encodeURIComponent(
        input.callSessionId
      );

    const actionUrl =
      (
        `${environment.publicBaseUrl}` +
        `/twilio/connect-action?callSessionId=`
      ) +
      encodeURIComponent(
        input.callSessionId
      );

    const conversationUrl =
      (
        `${environment.publicWebSocketUrl}` +
        `/twilio/conversation`
      );

    const twiml =
      buildConversationRelayTwiml({
        webSocketUrl:
          conversationUrl,

        callSessionId:
          input.callSessionId,

        welcomeGreeting:
          environment
            .welcomeGreeting,

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
            'multi',

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

      app.log.info(
        {
          callSessionId:
            state.callSessionId,

          providerCallId:
            state.providerCallId,

          destinationNumber:
            state.destinationNumber,
        },

        'Real Twilio call created.'
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
              : (
                  'Twilio could not create ' +
                  'the outbound call.'
                ),
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
        reportProviderEvent(
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
              : (
                  'Twilio could not cancel ' +
                  'the call.'
                ),
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
          reportProviderEvent(
            call,
            'ringing'
          );
          break;

        case 'in-progress':
          ensureConnected(
            call
          );
          break;

        case 'completed':
          await completeCall(
            call
          );
          break;

        case 'canceled':
          reportProviderEvent(
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
          reportProviderEvent(
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
        (
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<Response><Hangup /></Response>'
        )
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

          (
            `${environment.publicWebSocketUrl}` +
            request.url
          ),

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

                    utteranceUntilInterrupt?:
                      string;

                    durationUntilInterruptMs?:
                      number;

                    description?:
                      string;
                  };

                app.log.debug(
                  {
                    type:
                      message.type,

                    callSid:
                      message.callSid,

                    lang:
                      message.lang,

                    last:
                      message.last,
                  },

                  'ConversationRelay message received.'
                );

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

                  ensureConnected(
                    activeCall
                  );

                  app.log.info(
                    {
                      callSessionId:
                        activeCall
                          .callSessionId,

                      providerCallId:
                        activeCall
                          .providerCallId,
                    },

                    'ConversationRelay setup completed.'
                  );

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

                  await handleCallerPrompt(
                    socket,
                    activeCall,
                    callerText
                  );

                  return;
                }

                if (
                  message.type ===
                  'interrupt'
                ) {
                  app.log.info(
                    {
                      callSessionId:
                        activeCall
                          ?.callSessionId,

                      spokenBeforeInterrupt:
                        message
                          .utteranceUntilInterrupt,

                      durationMs:
                        message
                          .durationUntilInterruptMs,
                    },

                    'Caller interrupted AI speech.'
                  );

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

                      callSessionId:
                        activeCall
                          ?.callSessionId,
                    },

                    'ConversationRelay error.'
                  );
                }
              }
            )
            .catch(
              (error) => {
                app.log.error(
                  {
                    error:
                      error instanceof Error
                        ? error.message
                        : String(error),

                    callSessionId:
                      activeCall
                        ?.callSessionId,
                  },

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

    languageMode:
      'automatic-multilingual',

    geminiModel:
      environment
        .geminiModel,

    maxCallSeconds:
      environment
        .maxCallSeconds,
  },

  'VoiceNexus Twilio gateway started.'
);