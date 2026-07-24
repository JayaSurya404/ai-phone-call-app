import formbody
  from '@fastify/formbody';

import websocket
  from '@fastify/websocket';

import Fastify
  from 'fastify';

import twilio
  from 'twilio';

import WebSocket
  from 'ws';

import {
  sendProviderEvent,
} from './callback-client.js';

import {
  loadGatewayEnvironment,
} from './config.js';

import {
  ElevenLabsRealtimeStt,
} from './elevenlabs-stt.js';

import {
  isAbortError,
  sendTwilioClear,
  streamSpeechToTwilio,
} from './elevenlabs-tts.js';

import {
  generateGeminiReply,
  generateOpeningGreeting,
} from './gemini.js';

import {
  getLanguageProfile,
  languageProfiles,
} from './language-profiles.js';

import {
  buildMediaStreamTwiml,
} from './media-stream-twiml.js';

import type {
  ActiveGatewayCall,
  ProviderEventType,
  ProviderEventValues,
  StartCallInput,
} from './types.js';

const environment =
  loadGatewayEnvironment();

const app =
  Fastify({
    logger: true,
    bodyLimit:
      1024 * 1024,
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

interface MediaRuntime {
  socket: WebSocket;
  streamSid: string;
  stt:
    ElevenLabsRealtimeStt;
  turnQueue:
    Promise<void>;
  currentTtsAbort:
    AbortController | null;
  currentMarkName:
    string | null;
  isSpeaking: boolean;
  stopped: boolean;
}

const runtimesByStreamSid =
  new Map<
    string,
    MediaRuntime
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

  call.connectedSent =
    true;

  reportProviderEvent(
    call,
    'connected'
  );
}

function reportOpening(
  call: ActiveGatewayCall
): void {
  if (
    call.openingReported
  ) {
    return;
  }

  call.openingReported =
    true;

  reportProviderEvent(
    call,
    'transcript',
    {
      speaker:
        'AI_AGENT',

      content:
        call.openingGreeting,

      sentiment:
        'NEUTRAL',

      latencyMs: 0,
    }
  );
}

function summaryFor(
  call: ActiveGatewayCall
): string {
  const profile =
    getLanguageProfile(
      call.languageProfileId
    );

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
    `${profile.displayName} call completed with ` +
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

  call.completedSent =
    true;

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
  const profile =
    getLanguageProfile(
      call.languageProfileId
    );

  return [
    call.promptSnapshot,

    '',

    (
      'You are VoiceNexus, an AI voice agent speaking during ' +
      'a real telephone call.'
    ),

    (
      'The opening has already disclosed once that you are an ' +
      'AI assistant. Do not repeat that disclosure every turn.'
    ),

    (
      'Follow the exact call purpose and move the conversation ' +
      'toward a clear useful outcome.'
    ),

    (
      'Sound warm, calm, confident, concise, and conversational.'
    ),

    (
      'Use spoken phrasing, not essay or report phrasing.'
    ),

    (
      'Usually answer with one or two short sentences.'
    ),

    (
      'Acknowledge the caller naturally and ask at most one ' +
      'useful question at a time.'
    ),

    (
      'Never repeat an introduction, apology, or question that ' +
      'has already been answered.'
    ),

    (
      'Never use markdown, bullet points, headings, URLs, emoji, ' +
      'or stage directions.'
    ),

    (
      `The selected call profile is ${profile.displayName}.`
    ),

    (
      `Reply in ${profile.llmLanguageName}.`
    ),

    profile.llmInstruction,

    (
      'The caller may freely mix the selected local language ' +
      'with English. Understand the complete meaning rather than ' +
      'translating each word separately.'
    ),

    (
      'Match the caller naturally: if they use more English, use ' +
      'more English; if they use more local language, use more ' +
      'local language.'
    ),

    (
      `Code-switching example: ${profile.mixedExample}`
    ),

    (
      'Do not switch to an unrelated third language.'
    ),

    (
      'If the transcript is unclear, ask one short clarification.'
    ),

    (
      'Do not end the call only because the caller changed language.'
    ),

    (
      'Close politely only after the objective is complete or the ' +
      'caller clearly asks to end the call.'
    ),
  ].join('\n');
}

function interruptSpeech(
  runtime:
    MediaRuntime
): void {
  if (
    !runtime.isSpeaking
  ) {
    return;
  }

  runtime.currentTtsAbort
    ?.abort();

  sendTwilioClear(
    runtime.socket,
    runtime.streamSid
  );

  runtime.currentTtsAbort =
    null;

  runtime.currentMarkName =
    null;

  runtime.isSpeaking =
    false;

  app.log.info(
    {
      streamSid:
        runtime.streamSid,
    },

    'Caller interrupted buffered AI speech.'
  );
}

async function speakText(
  call: ActiveGatewayCall,
  runtime:
    MediaRuntime,
  text: string
): Promise<void> {
  if (
    runtime.stopped
  ) {
    return;
  }

  if (
    runtime.isSpeaking
  ) {
    interruptSpeech(
      runtime
    );
  }

  const controller =
    new AbortController();

  runtime.currentTtsAbort =
    controller;

  runtime.isSpeaking =
    true;

  const profile =
    getLanguageProfile(
      call.languageProfileId
    );

  try {
    const markName =
      await streamSpeechToTwilio({
        apiKey:
          environment
            .elevenLabsApiKey,

        voiceId:
          environment
            .elevenLabsVoiceId,

        profile,

        text,

        socket:
          runtime.socket,

        streamSid:
          runtime.streamSid,

        signal:
          controller.signal,
      });

    runtime.currentTtsAbort =
      null;

    runtime.currentMarkName =
      markName;
  } catch (error) {
    runtime.currentTtsAbort =
      null;

    runtime.currentMarkName =
      null;

    runtime.isSpeaking =
      false;

    if (
      isAbortError(error)
    ) {
      return;
    }

    app.log.error(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),

        callSessionId:
          call.callSessionId,

        profile:
          profile.id,
      },

      'ElevenLabs TTS failed.'
    );
  }
}

async function handleCallerTurn(
  call: ActiveGatewayCall,
  runtime:
    MediaRuntime,
  callerText: string,
  detectedLanguage:
    string | undefined
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
      2_000
  ) {
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

  reportProviderEvent(
    call,
    'transcript',
    {
      speaker:
        'REMOTE_PARTY',

      content:
        callerText,

      sentiment:
        'NEUTRAL',
    }
  );

  app.log.info(
    {
      callSessionId:
        call.callSessionId,

      callerText,

      detectedLanguage,

      profile:
        call.languageProfileId,
    },

    'Committed multilingual caller transcript received.'
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
            .slice(-20),
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
      },

      'Gemini response failed.'
    );

    responseText =
      (
        'Sorry, I had a brief connection issue. ' +
        'Could you please say that once more?'
      );
  }

  const latency =
    Date.now() -
    startedAt;

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

  await speakText(
    call,
    runtime,
    responseText
  );

  app.log.info(
    {
      callSessionId:
        call.callSessionId,

      latencyMs:
        latency,

      responseText,
    },

    'Multilingual AI response sent to Twilio.'
  );
}

async function verifyElevenLabs():
Promise<{
  voiceName: string;
}> {
  const userResponse =
    await fetch(
      'https://api.elevenlabs.io/v1/user',

      {
        headers: {
          'xi-api-key':
            environment
              .elevenLabsApiKey,
        },
      }
    );

  if (!userResponse.ok) {
    const body =
      await userResponse.text();

    throw new Error(
      body ||
      (
        'ElevenLabs authentication failed with HTTP ' +
        `${userResponse.status}.`
      )
    );
  }

  const voiceResponse =
    await fetch(
      (
        'https://api.elevenlabs.io/v1/voices/' +
        encodeURIComponent(
          environment
            .elevenLabsVoiceId
        )
      ),

      {
        headers: {
          'xi-api-key':
            environment
              .elevenLabsApiKey,
        },
      }
    );

  if (!voiceResponse.ok) {
    const body =
      await voiceResponse.text();

    throw new Error(
      body ||
      (
        'ElevenLabs voice lookup failed with HTTP ' +
        `${voiceResponse.status}.`
      )
    );
  }

  const voice =
    await voiceResponse
      .json() as {
        name?: string;
      };

  return {
    voiceName:
      voice.name ??
      'Configured voice',
  };
}

app.get(
  '/health',

  async () => ({
    status: 'ok',

    service:
      'voicenexus-twilio-gateway',

    provider:
      'twilio-media-streams',

    stt:
      environment
        .elevenLabsSttModel,

    tts:
      'elevenlabs-ulaw-8000',

    languageProfiles:
      languageProfiles.length,

    geminiModel:
      environment
        .geminiModel,

    maxCallSeconds:
      environment
        .maxCallSeconds,
  })
);

app.get(
  '/v1/languages',

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

    return languageProfiles.map(
      (profile) => ({
        id:
          profile.id,

        displayName:
          profile.displayName,

        nativeName:
          profile.nativeName,

        region:
          profile.region,

        sttPrimaryLanguage:
          profile
            .sttPrimaryLanguage,

        sttSecondaryLanguages:
          profile
            .sttSecondaryLanguages,

        ttsModel:
          profile.ttsModel,
      })
    );
  }
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
      const [
        geminiReply,
        elevenLabs,
      ] =
        await Promise.all([
          generateGeminiReply({
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
                text:
                  'Test now.',
              },
            ],
          }),

          verifyElevenLabs(),
        ]);

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

        elevenLabs: {
          sttModel:
            environment
              .elevenLabsSttModel,

          voiceId:
            environment
              .elevenLabsVoiceId,

          voiceName:
            elevenLabs
              .voiceName,

          audioFormat:
            'ulaw_8000',
        },

        mediaPipeline:
          'twilio-media-streams',

        languageProfiles:
          languageProfiles.length,

        maxCallSeconds:
          environment
            .maxCallSeconds,
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

    const profile =
      getLanguageProfile(
        input.languageCode
      );

    const openingGreeting =
      await generateOpeningGreeting({
        apiKey:
          environment
            .geminiApiKey,

        model:
          environment
            .geminiModel,

        callPurpose:
          input.promptSnapshot,

        profile,
      });

    const provisionalProviderId =
      `pending-${input.callSessionId}`;

    const state:
      ActiveGatewayCall = {
        callSessionId:
          input.callSessionId,

        providerCallId:
          provisionalProviderId,

        destinationNumber:
          input
            .destinationNumber,

        promptSnapshot:
          input
            .promptSnapshot,

        languageProfileId:
          profile.id,

        openingGreeting,

        callback:
          input.callback,

        history: [
          {
            role: 'model',
            text:
              openingGreeting,
          },
        ],

        transcript: [
          {
            speaker:
              'AI_AGENT',

            content:
              openingGreeting,
          },
        ],

        createdAt:
          new Date()
            .toISOString(),

        connectedSent:
          false,

        openingReported:
          false,

        completedSent:
          false,
      };

    callsByInternalId.set(
      state.callSessionId,
      state
    );

    const statusCallbackUrl =
      (
        `${environment.publicBaseUrl}` +
        `/twilio/status?callSessionId=`
      ) +
      encodeURIComponent(
        input.callSessionId
      );

    const twiml =
      buildMediaStreamTwiml({
        webSocketUrl:
          (
            `${environment.publicWebSocketUrl}` +
            `/twilio/media`
          ),

        callSessionId:
          input.callSessionId,

        languageProfileId:
          profile.id,
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

      state.providerCallId =
        created.sid;

      callsByProviderId.set(
        created.sid,
        state
      );

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

      app.log.info(
        {
          callSessionId:
            state.callSessionId,

          providerCallId:
            state.providerCallId,

          destinationNumber:
            state.destinationNumber,

          languageProfile:
            profile.id,

          sttPrimary:
            profile
              .sttPrimaryLanguage,

          sttSecondary:
            profile
              .sttSecondaryLanguages,

          ttsModel:
            profile.ttsModel,
        },

        'Real multilingual Twilio call created.'
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
      callsByInternalId.delete(
        state.callSessionId
      );

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
          status:
            'completed',
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
    const call =
      getCall(
        request.query
          .callSessionId,

        request.body.CallSid
      );

    const callStatus =
      request.body
        .CallStatus
        ?.toLowerCase();

    if (!call) {
      return reply
        .code(204)
        .send();
    }

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

    return reply
      .code(204)
      .send();
  }
);

app.get(
  '/twilio/media',

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

    let runtime:
      MediaRuntime | null =
      null;

    socket.on(
      'message',

      (rawData) => {
        void (
          async () => {
            const message =
              JSON.parse(
                rawData.toString()
              ) as {
                event?: string;
                streamSid?: string;

                start?: {
                  streamSid?: string;
                  callSid?: string;

                  mediaFormat?: {
                    encoding?: string;
                    sampleRate?: number;
                    channels?: number;
                  };

                  customParameters?: {
                    callSessionId?:
                      string;

                    languageProfileId?:
                      string;
                  };
                };

                media?: {
                  payload?: string;
                };

                mark?: {
                  name?: string;
                };

                stop?: {
                  callSid?: string;
                };
              };

            if (
              message.event ===
              'start'
            ) {
              const callSessionId =
                message.start
                  ?.customParameters
                  ?.callSessionId;

              const callSid =
                message.start
                  ?.callSid;

              const streamSid =
                message.streamSid ||
                message.start
                  ?.streamSid;

              activeCall =
                getCall(
                  callSessionId,
                  callSid
                );

              if (
                !activeCall ||
                !streamSid
              ) {
                socket.close(
                  1008,
                  'Unknown call session.'
                );

                return;
              }

              if (
                callSid &&
                activeCall
                  .providerCallId
                  .startsWith(
                    'pending-'
                  )
              ) {
                activeCall
                  .providerCallId =
                  callSid;

                callsByProviderId.set(
                  callSid,
                  activeCall
                );
              }

              const profile =
                getLanguageProfile(
                  activeCall
                    .languageProfileId
                );

              let mediaRuntime:
                MediaRuntime;

              const stt =
                new ElevenLabsRealtimeStt({
                  apiKey:
                    environment
                      .elevenLabsApiKey,

                  modelId:
                    environment
                      .elevenLabsSttModel,

                  profile,

                  callbacks: {
                    onPartial(
                      text
                    ) {
                      if (
                        text.trim()
                          .length >= 2
                      ) {
                        interruptSpeech(
                          mediaRuntime
                        );
                      }
                    },

                    onCommitted(
                      text,
                      detectedLanguage
                    ) {
                      mediaRuntime
                        .turnQueue =
                        mediaRuntime
                          .turnQueue
                          .then(
                            async () => {
                              if (
                                activeCall &&
                                !mediaRuntime
                                  .stopped
                              ) {
                                await handleCallerTurn(
                                  activeCall,
                                  mediaRuntime,
                                  text,
                                  detectedLanguage
                                );
                              }
                            }
                          )
                          .catch(
                            (error) => {
                              app.log.error(
                                error,

                                'Caller turn processing failed.'
                              );
                            }
                          );
                    },

                    onError(
                      error
                    ) {
                      app.log.error(
                        {
                          error:
                            error.message,

                          callSessionId:
                            activeCall
                              ?.callSessionId,

                          profile:
                            profile.id,
                        },

                        'ElevenLabs realtime STT error.'
                      );
                    },
                  },
                });

              mediaRuntime = {
                socket,
                streamSid,
                stt,
                turnQueue:
                  Promise.resolve(),
                currentTtsAbort:
                  null,
                currentMarkName:
                  null,
                isSpeaking:
                  false,
                stopped:
                  false,
              };

              runtime =
                mediaRuntime;

              runtimesByStreamSid.set(
                streamSid,
                mediaRuntime
              );

              const format =
                message.start
                  ?.mediaFormat;

              if (
                format?.encoding !==
                  'audio/x-mulaw' ||
                format.sampleRate !==
                  8000 ||
                format.channels !==
                  1
              ) {
                throw new Error(
                  'Twilio media must be Î¼-law, 8000 Hz, mono.'
                );
              }

              await stt.connect();

              ensureConnected(
                activeCall
              );

              reportOpening(
                activeCall
              );

              void speakText(
                activeCall,
                mediaRuntime,
                activeCall
                  .openingGreeting
              );

              app.log.info(
                {
                  callSessionId:
                    activeCall
                      .callSessionId,

                  streamSid,

                  profile:
                    profile.id,

                  primaryLanguage:
                    profile
                      .sttPrimaryLanguage,

                  secondaryLanguages:
                    profile
                      .sttSecondaryLanguages,
                },

                'Twilio multilingual Media Stream started.'
              );

              return;
            }

            if (
              message.event ===
                'media' &&
              runtime &&
              message.media
                ?.payload
            ) {
              runtime.stt
                .sendAudio(
                  message.media
                    .payload
                );

              return;
            }

            if (
              message.event ===
                'mark' &&
              runtime
            ) {
              if (
                message.mark
                  ?.name ===
                runtime
                  .currentMarkName
              ) {
                runtime
                  .currentMarkName =
                  null;

                runtime.isSpeaking =
                  false;
              }

              return;
            }

            if (
              message.event ===
              'stop'
            ) {
              if (runtime) {
                runtime.stopped =
                  true;

                runtime
                  .currentTtsAbort
                  ?.abort();

                runtime.stt
                  .close();

                runtimesByStreamSid
                  .delete(
                    runtime
                      .streamSid
                  );
              }

              if (activeCall) {
                await completeCall(
                  activeCall
                );
              }
            }
          }
        )().catch(
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

              'Twilio Media Stream message failed.'
            );

            if (activeCall) {
              reportProviderEvent(
                activeCall,
                'failed',
                {
                  reason:
                    error instanceof Error
                      ? error.message
                      : (
                          'Realtime media pipeline failed.'
                        ),
                }
              );
            }
          }
        );
      }
    );

    socket.on(
      'close',

      () => {
        if (runtime) {
          runtime.stopped =
            true;

          runtime
            .currentTtsAbort
            ?.abort();

          runtime.stt
            .close();

          runtimesByStreamSid
            .delete(
              runtime.streamSid
            );
        }

        app.log.info(
          {
            callSessionId:
              activeCall
                ?.callSessionId,
          },

          'Twilio Media Stream socket closed.'
        );
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
      'twilio-media-streams',

    stt:
      environment
        .elevenLabsSttModel,

    tts:
      'elevenlabs-ulaw-8000',

    languageProfiles:
      languageProfiles.length,

    maxCallSeconds:
      environment
        .maxCallSeconds,
  },

  'VoiceNexus multilingual media gateway started.'
);